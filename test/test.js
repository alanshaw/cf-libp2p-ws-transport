import test from 'ava'
import { Miniflare } from 'miniflare'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identify } from '@libp2p/identify'
import { pipe } from 'it-pipe'
import { fromString, toString } from 'uint8arrays'
import { multiaddr } from '@multiformats/multiaddr'
import { serverPort, serverAddr, serverPeer, echoProtocol } from './helpers/constants.js'

test('should work in miniflare', async t => {
  const mf = new Miniflare({
    modules: true,
    scriptPath: './test/helpers/worker.bundle.js',
    port: serverPort
  })
  await mf.ready

  let node
  try {
    node = await createLibp2p({
      transports: [webSockets()],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      services: {
        identify: identify()
      }
    })

    const dialAddr = multiaddr(`${serverAddr}/p2p/${serverPeer.id}`)
    const stream = await node.dialProtocol(dialAddr, echoProtocol)

    const data = Date.now().toString()
    const result = await pipe(
      [fromString(data)],
      stream,
      async source => {
        // eslint-disable-next-line no-unreachable-loop
        for await (const chunk of source) return toString(chunk.subarray())
      }
    )
    t.is(result, data)
  } finally {
    if (node) await node.stop()
    mf.dispose()
  }
})
