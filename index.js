/* eslint-env worker */

import { symbol } from '@libp2p/interfaces/transport'
import * as mafmt from '@multiformats/mafmt'
import { Multiaddr } from '@multiformats/multiaddr'
import { multiaddrToUri } from '@multiformats/multiaddr-to-uri'
import { WebSocketListener } from './listener.js'
import { socketToMaConn } from './utils.js'

const CODE_P2P = 421

/**
 * @implements {import('@libp2p/interfaces/transport').Transport}
 */
export class WebSockets {
  get [Symbol.toStringTag] () {
    return 'cf-libp2p-ws-transport'
  }

  get [symbol] () {
    return true
  }

  constructor () {
    /** @type {WebSocketListener[]} */
    this._listeners = []
  }

  /**
   * @param {Multiaddr} addr
   * @param {import('@libp2p/interfaces/transport').DialOptions} options
   */
  async dial (addr, { signal, upgrader }) {
    const url = multiaddrToUri(addr).replace('ws:', 'http:').replace('wss:', 'https:')

    // Make a fetch request including `Upgrade: websocket` header.
    // The Workers Runtime will automatically handle other requirements
    // of the WebSocket protocol, like the Sec-WebSocket-Key header.
    const res = await fetch(url, { headers: { Upgrade: 'websocket' }, signal })

    // If the WebSocket handshake completed successfully, then the
    // response has a `webSocket` property.
    const socket = res.webSocket
    if (!socket) throw new Error('server did not accept WebSocket')

    // Call accept() to indicate that you'll be handling the socket here
    // in JavaScript, as opposed to returning it on to a client.
    socket.accept()

    return upgrader.upgradeOutbound(socketToMaConn(socket, addr))
  }

  /**
   * @param {import('@libp2p/interfaces/transport').CreateListenerOptions} options
   */
  createListener (options) {
    const listener = new WebSocketListener(options)
    this._listeners.push(listener)
    return listener
  }

  /**
   * @param {Multiaddr|string} addr
   */
  listenerForMultiaddr (addr) {
    addr = addr instanceof Multiaddr ? addr : new Multiaddr(addr)
    return this._listeners.find(l => l.getAddrs().some(a => a.equals(addr)))
  }

  /**
   * @param {Multiaddr[]} addrs
   */
  filter (addrs) {
    return (Array.isArray(addrs) ? addrs : [addrs]).filter(a => {
      a = a.decapsulateCode(CODE_P2P)
      return mafmt.WebSocketsSecure.matches(a) || mafmt.WebSockets.matches(a)
    })
  }
}
