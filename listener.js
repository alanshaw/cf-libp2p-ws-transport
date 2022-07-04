/* eslint-env worker */
/* global WebSocketPair */

import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import { socketToMaConn } from './utils.js'

/**
 * @typedef {import('@libp2p/interface-transport').Listener} Listener
 * @typedef {import('@multiformats/multiaddr').Multiaddr} Multiaddr
 * @typedef {import('@libp2p/interface-connection').MultiaddrConnection} MultiaddrConnection
 * @typedef {import('@libp2p/interface-transport').CreateListenerOptions} CreateListenerOptions
 */

/**
 * @implements {Listener}
 */
export class WebSocketListener extends EventEmitter {
  /**
   * @param {CreateListenerOptions} init
   */
  constructor (init) {
    super()
    /** @type {CreateListenerOptions} */
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
    this._onOpen(server)

    return new Response(null, { status: 101, webSocket: client })
  }

  /**
   * @param {WebSocket} socket
   */
  async _onOpen (socket) {
    const maConn = socketToMaConn(socket)
    this._connections.add(maConn)
    socket.addEventListener('close', () => this._connections.delete(maConn))
    try {
      const conn = await this._init.upgrader.upgradeInbound(maConn)
      if (this._init.handler) this._init.handler(conn)
      this.dispatchEvent(new CustomEvent('connection', { detail: conn }))
    } catch (err) {
      console.error(err)
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
