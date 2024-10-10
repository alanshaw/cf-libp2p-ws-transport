/* eslint-env browser */
/* global WebSocketPair */
import { TypedEventEmitter } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import { socketToMaConn } from './utils.js'

/**
 * @typedef {import('@libp2p/interface').Listener} Listener
 * @typedef {import('@multiformats/multiaddr').Multiaddr} Multiaddr
 * @typedef {import('@libp2p/interface').MultiaddrConnection} MultiaddrConnection
 * @typedef {import('./listener.js').WebSocketListenerComponents} WebSocketListenerComponents
 * @typedef {import('./listener.js').WebSocketListenerInit} WebSocketListenerInit
 */

/**
 * @implements {Listener}
 */
export class WebSocketListener extends TypedEventEmitter {
  /**
   * @param {WebSocketListenerComponents} components
   * @param {WebSocketListenerInit} init
   */
  constructor (components, init) {
    super()

    this.log = components.logger.forComponent('libp2p:websockets:listener')
    this.components = components

    /** @type {WebSocketListenerInit} */
    this._init = init
    /** @type {Multiaddr} */
    this._listeningAddr = null
    /** @type {Set<MultiaddrConnection>} */
    this._connections = new Set()
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async handleRequest (request) {
    // TODO: reject if not on listening address
    const upgradeHeader = request.headers.get('Upgrade')
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }

    /** @type {{ 0: WebSocket, 1: WebSocket }} */
    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    server.accept()
    this._onOpen(server, getRemoteAddr(request))

    return new Response(null, { status: 101, webSocket: client })
  }

  /**
   * @param {WebSocket} socket
   * @param {Multiaddr} remoteAddr
   */
  async _onOpen (socket, remoteAddr) {
    const maConn = socketToMaConn(socket, remoteAddr, { logger: this.components.logger })
    this.log('new inbound connection %s', maConn.remoteAddr)
    this._connections.add(maConn)
    socket.addEventListener('close', () => {
      this.log('inbound connection %s closed', maConn.remoteAddr)
      this._connections.delete(maConn)
    }, { once: true })
    try {
      const conn = await this._init.upgrader.upgradeInbound(maConn)
      this.log('inbound connection %s upgraded', maConn.remoteAddr)
      if (this._init.handler) this._init.handler(conn)
      this.dispatchEvent(new CustomEvent('connection', { detail: conn }))
    } catch (err) {
      this.log.error('inbound connection failed to upgrade', err)
      maConn.close()
    }
  }

  /**
   * @param {Multiaddr} addr
   */
  async listen (addr) {
    this._listeningAddr = addr
    setTimeout(() => this.dispatchEvent(new CustomEvent('listening')))
  }

  getAddrs () {
    return [this._listeningAddr]
  }

  close () {
    this._connections.forEach(maConn => maConn.close())
    this._connections = new Set()
  }
}

/**
 * @param {Request} request
 */
function getRemoteAddr (request) {
  const connectingIp = request.headers.get('cf-connecting-ip') || '0.0.0.0'
  const protocol = connectingIp.includes(':') ? 'ip6' : 'ip4'
  const transport = request.url.startsWith('https://') ? 'wss' : 'ws'
  return multiaddr(`/${protocol}/${connectingIp}/${transport}`)
}
