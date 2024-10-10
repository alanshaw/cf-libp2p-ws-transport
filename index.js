/* eslint-env worker */
import { transportSymbol, serviceCapabilities } from '@libp2p/interface'
import * as mafmt from '@multiformats/mafmt'
import { multiaddr, isMultiaddr } from '@multiformats/multiaddr'
import { multiaddrToUri } from '@multiformats/multiaddr-to-uri'
import { CustomProgressEvent } from 'progress-events'
import { WebSocketListener } from './listener.js'
import { socketToMaConn } from './utils.js'

/**
 * @typedef {import('@multiformats/multiaddr').Multiaddr} Multiaddr
 * @typedef {import('./index.js').WebSocketsDialEvents} WebSocketsDialEvents
 * @typedef {import('@libp2p/interface').Transport<WebSocketsDialEvents>} WebSocketsTransport
 */

const CODE_P2P = 421
const CODE_CIRCUIT = 290

/**
 * @implements {WebSocketsTransport}
 */
export class WebSockets {
  get [Symbol.toStringTag] () {
    return 'cf-libp2p-ws-transport'
  }

  get [transportSymbol] () {
    return true
  }

  get [serviceCapabilities] () {
    return ['@libp2p/transport']
  }

  /**
   * @param {import('./index.js').WebSocketsComponents} components
   * @param {import('./index.js').WebSocketsInit} [init]
   */
  constructor (components, init) {
    this.log = components.logger.forComponent('libp2p:websockets')
    this.logger = components.logger
    this.components = components
    this.init = init
    /** @type {WebSocketListener[]} */
    this._listeners = []
  }

  /**
   * @param {Multiaddr} addr
   * @param {import('@libp2p/interface').DialTransportOptions<WebSocketsDialEvents>} options
   */
  async dial (addr, options) {
    const { signal, upgrader, onProgress } = options
    this.log('dialing %s', addr)

    const url = multiaddrToUri(addr).replace('ws:', 'http:').replace('wss:', 'https:')

    onProgress?.(new CustomProgressEvent('websockets:open-connection'))

    // Make a fetch request including `Upgrade: websocket` header.
    // The Workers Runtime will automatically handle other requirements
    // of the WebSocket protocol, like the Sec-WebSocket-Key header.
    const res = await fetch(url, { headers: { Upgrade: 'websocket' }, signal })

    // If the WebSocket handshake completed successfully, then the
    // response has a `webSocket` property.
    /** @type {WebSocket} */
    const socket = res.webSocket
    if (!socket) throw new Error('server did not accept WebSocket')

    // Call accept() to indicate that you'll be handling the socket here
    // in JavaScript, as opposed to returning it on to a client.
    socket.accept()

    this.log('connected %s', addr)

    const maConn = socketToMaConn(socket, addr, { logger: this.logger })
    this.log('new outbound connection %s', maConn.remoteAddr)

    const conn = await upgrader.upgradeOutbound(maConn, options)
    this.log('outbound connection %s upgraded', maConn.remoteAddr)

    return conn
  }

  /**
   * @param {import('@libp2p/interface').CreateListenerOptions} options
   */
  createListener (options) {
    const listener = new WebSocketListener({ logger: this.logger }, {
      ...this.init,
      ...options
    })
    this._listeners.push(listener)
    return listener
  }

  /**
   * @param {Multiaddr|string} addr
   */
  listenerForMultiaddr (addr) {
    addr = isMultiaddr(addr) ? addr : multiaddr(addr)
    return this._listeners.find(l => l.getAddrs().some(a => a.equals(addr)))
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses.
   *
   * @param {Multiaddr[]} addrs
   */
  listenFilter (addrs) {
    addrs = Array.isArray(addrs) ? addrs : [addrs]

    if (this.init?.filter != null) {
      return this.init?.filter(addrs)
    }

    return addrs.filter((ma) => {
      if (ma.protoCodes().includes(CODE_CIRCUIT)) {
        return false
      }
      ma = ma.decapsulateCode(CODE_P2P)
      return mafmt.WebSockets.matches(ma) || mafmt.WebSocketsSecure.matches(ma)
    })
  }

  /** Filter check for all Multiaddrs that this transport can dial. */
  dialFilter (multiaddrs) {
    return this.listenFilter(multiaddrs)
  }
}
