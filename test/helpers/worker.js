import { createLibp2p } from 'libp2p'
import { WebSockets } from '../../index.js'
import { Mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { serverAddr, serverPeer, echoProtocol } from './constants.js'

// import { enable } from '@libp2p/logger'
// enable('libp2p*')

export default {
  async fetch (request) {
    const { Noise } = await import('@chainsafe/libp2p-noise')
    const wsTransport = new WebSockets()
    const node = await createLibp2p({
      peerId: await createFromJSON(serverPeer),
      addresses: { listen: [serverAddr] },
      transports: [wsTransport],
      streamMuxers: [new Mplex()],
      connectionEncryption: [new Noise()]
    })

    node.handle(echoProtocol, ({ stream }) => pipe(stream, stream))

    await node.start()

    const listener = wsTransport.listenerForMultiaddr(serverAddr)
    return listener.handleRequest(request)
  }
}
