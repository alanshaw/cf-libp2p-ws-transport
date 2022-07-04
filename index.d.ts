import { Transport } from '@libp2p/interface-transport'
import { Multiaddr } from '@multiformats/multiaddr'
import { WebSocketListener } from './listener'

export { WebSocketListener }

export interface WebSockets extends Transport {
  /**
   * Find the listener for the passed multiaddr.
   */
  listenerForMultiaddr (a: Multiaddr): WebSocketListener | undefined
}
