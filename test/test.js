import test from 'ava'
import { Miniflare } from 'miniflare'
import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'
import { fromString, toString } from 'uint8arrays'
import { serverPort, serverAddr, serverPeer, echoProtocol } from './helpers/constants.js'

test('should work in miniflare', async t => {
  const mf = new Miniflare({
    modules: true,
    scriptPath: './test/helpers/worker.bundle.js',
    port: serverPort
  })

  const server = await mf.startServer()
  try {
    const node = await createLibp2p({
      transports: [new WebSockets()],
      streamMuxers: [new Mplex()],
      connectionEncryption: [new Noise()]
    })

    await node.start()

    const dialAddr = `${serverAddr}/p2p/${serverPeer.id}`
    const { stream } = await node.dialProtocol(dialAddr, echoProtocol)

    const data = Date.now().toString()
    const result = await pipe(
      [fromString(data)],
      stream,
      async source => {
        // eslint-disable-next-line no-unreachable-loop
        for await (const chunk of source) return toString(chunk)
      }
    )
    t.is(result, data)
  } finally {
    server.close()
  }
})
