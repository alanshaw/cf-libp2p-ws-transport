import { Listener } from '@libp2p/interface-transport'

export interface WebSocketListener extends Listener {
  /**
   * Create a WebSocket response for the passed websocket upgrade request.
   */
  handleRequest (request: Request): Promise<Response>
}
