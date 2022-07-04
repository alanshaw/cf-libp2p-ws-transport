import { Transport, Listener, symbol, CreateListenerOptions, DialOptions } from '@libp2p/interface-transport'
import { Connection } from '@libp2p/interface-connection'
import { Multiaddr } from '@multiformats/multiaddr'
import { WebSocketListener } from './listener'

export { WebSocketListener }

export declare class WebSockets implements Transport {
  get [Symbol.toStringTag](): string
  get [symbol](): true
  /**
   * Opens a connection to the passed address.
   */
  dial(ma: Multiaddr, options: DialOptions): Promise<Connection>
  /**
   * Creates a WebSockets listener. The provided `handler` function will be
   * called anytime a new incoming Connection has been successfully upgraded
   * via `upgrader.upgradeInbound`
   */
  createListener(options: CreateListenerOptions): Listener
  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses.
   */
  filter(multiaddrs: Multiaddr[]): Multiaddr[]
  /**
   * Finds the listener for the passed multiaddr.
   */
  listenerForMultiaddr (a: Multiaddr): WebSocketListener | undefined
}
