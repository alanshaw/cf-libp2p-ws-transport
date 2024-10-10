import { ComponentLogger, CreateListenerOptions, Listener } from '@libp2p/interface'

export interface WebSocketListenerInit extends CreateListenerOptions {}

export interface WebSocketListenerComponents {
  logger: ComponentLogger
}

export interface WebSocketListener extends Listener {
  /**
   * Create a WebSocket response for the passed websocket upgrade request.
   */
  handleRequest (request: Request): Promise<Response>
}
