/* eslint-env worker */

import { symbol } from '@libp2p/interface-transport'
import * as mafmt from '@multiformats/mafmt'
import { Multiaddr } from '@multiformats/multiaddr'
import { WebSocketListener } from './listener.js'

/**
 * @typedef {import('@libp2p/interface-transport').Transport} Transport
 * @typedef {import('@libp2p/interface-transport').CreateListenerOptions} CreateListenerOptions
 */

const CODE_P2P = 421

/**
 * @implements {Transport}
 */
export class WebSockets {
  get [Symbol.toStringTag] () {
    return '@web3-storage/cf-libp2p-ws-transport'
  }

  get [symbol] () {
    return true
  }

  constructor () {
    /** @type {WebSocketListener[]} */
    this._listeners = []
  }

  async dial () {
    throw new Error('not implemented')
  }

  /**
   * @param {CreateListenerOptions} options
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
