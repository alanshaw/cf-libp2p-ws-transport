# cf-libp2p-ws-transport

[![Build](https://github.com/alanshaw/cf-libp2p-ws-transport/actions/workflows/build.yml/badge.svg)](https://github.com/alanshaw/cf-libp2p-ws-transport/actions/workflows/build.yml)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Libp2p WebSocket transport for Cloudflare WebSockets.

## Install

```
npm install cf-libp2p-ws-transport
```

## Usage

```js

import { createLibp2p } from 'libp2p'
import { WebSockets } from 'cf-libp2p-ws-transport'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { pipe } from 'it-pipe'

const listenAddr = '/ip4/127.0.0.1/tcp/1234/ws'
const echoProtocol = '/test/echo/1.0.0'

export default {
  async fetch (request) {
    let wsTransport
    const node = await createLibp2p({
      addresses: { listen: [listenAddr] },
      transports: [components => {
        wsTransport = new WebSockets(components)
        return wsTransport
      }],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()]
    })

    node.handle(echoProtocol, ({ stream }) => pipe(stream, stream))

    const listener = wsTransport.listenerForMultiaddr(listenAddr)
    return listener.handleRequest(request)
  }
}
```

## Contributing

Feel free to join in. All welcome. [Open an issue](https://github.com/alanshaw/cf-libp2p-ws-transport/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/alanshaw/cf-libp2p-ws-transport/blob/main/LICENSE.md)
