import { Transport, Listener, transportSymbol, CreateListenerOptions, AbortOptions, DialTransportOptions, Connection, OutboundConnectionUpgradeEvents, MultiaddrFilter, ComponentLogger, Metrics } from '@libp2p/interface'
import { Multiaddr } from '@multiformats/multiaddr'
import { ProgressEvent } from 'progress-events'
import { WebSocketListener } from './listener.js'

export { WebSocketListener }

export type WebSocketsDialEvents =
  OutboundConnectionUpgradeEvents |
  ProgressEvent<'websockets:open-connection'>

export declare class WebSockets implements Transport<WebSocketsDialEvents> {
  /**
   * Used to identify the transport.
   */
  [Symbol.toStringTag]: string

  /**
   * Used by the isTransport function.
   */
  [transportSymbol]: true

  /**
   * Dial a given multiaddr.
   */
  dial(ma: Multiaddr, options: DialTransportOptions<ProgressEvent>): Promise<Connection>

  /**
   * Create transport listeners.
   */
  createListener(options: CreateListenerOptions): Listener

  /**
   * Takes a list of `Multiaddr`s and returns only addresses that are valid for
   * the transport to listen on.
   */
  listenFilter: MultiaddrFilter

  /**
   * Takes a list of `Multiaddr`s and returns only addresses that are vali for
   * the transport to dial.
   */
  dialFilter: MultiaddrFilter

  /**
   * Finds the listener for the passed multiaddr.
   */
  listenerForMultiaddr (a: Multiaddr): WebSocketListener | undefined
}

export interface WebSocketsInit extends AbortOptions {
  filter?: MultiaddrFilter
}

export interface WebSocketsComponents {
  logger: ComponentLogger
  metrics?: Metrics
}

export declare function webSockets(init?: WebSocketsInit): (components: WebSocketsComponents) => Transport
