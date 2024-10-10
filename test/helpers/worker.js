import { createLibp2p } from 'libp2p'
import { WebSockets } from '../../index.js'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import { pipe } from 'it-pipe'
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys'
import { identify } from '@libp2p/identify'
import { fromString } from 'uint8arrays'
import { serverAddr, serverPeer, echoProtocol } from './constants.js'

// import { enable } from '@libp2p/logger'
// enable('libp2p*')

export default {
  async fetch (request) {
    /** @type {WebSockets} */
    let wsTransport
    const node = await createLibp2p({
      privateKey: privateKeyFromProtobuf(fromString(serverPeer.privKey, 'base64pad')),
      addresses: { listen: [serverAddr] },
      transports: [(components) => {
        wsTransport = new WebSockets(components)
        return wsTransport
      }],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      services: {
        identify: identify()
      }
    })

    node.handle(echoProtocol, ({ stream }) => pipe(stream, stream))

    const listener = wsTransport.listenerForMultiaddr(serverAddr)
    return listener.handleRequest(request)
  }
}
