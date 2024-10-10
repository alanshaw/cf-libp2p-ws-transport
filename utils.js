import { EventIterator } from 'event-iterator'

/**
 * @typedef {import('@libp2p/interface').MultiaddrConnection} MultiaddrConnection
 */

/**
 * @param {WebSocket} socket
 * @param {Multiaddr} remoteAddr
 * @param {{ logger: import('@libp2p/interface').ComponentLogger }} config
 * @returns {MultiaddrConnection}
 */
export function socketToMaConn (socket, remoteAddr, config) {
  const log = config.logger.forComponent('libp2p:websockets:maconn')

  /** @type {MultiaddrConnection} */
  const maConn = {
    async sink (source) {
      try {
        for await (const chunk of source) {
          if (maConn.timeline.close) break // do not try to send if closed
          socket.send(chunk.subarray())
        }
      } catch (err) {
        if (err.type !== 'aborted') {
          log.error(err)
        }
      }
    },

    source: (async function * () {
      /** @type {EventIterator<MessageEvent<Uint8Array>>} */
      const source = new EventIterator(
        queue => {
          socket.addEventListener('message', queue.push)
          socket.addEventListener('close', queue.stop)
          socket.addEventListener('error', queue.fail)
          return () => {
            socket.removeEventListener('message', queue.push)
            socket.removeEventListener('close', queue.stop)
            socket.removeEventListener('error', queue.fail)
          }
        }
      )
      for await (const message of source) {
        yield new Uint8Array(message.data)
      }
    })(),

    remoteAddr,

    timeline: { open: Date.now() },

    async close () {
      socket.close()
      maConn.timeline.close = Date.now()
    },

    abort (err) {
      const { host, port } = maConn.remoteAddr.toOptions()
      log('closing stream to %s:%s due to error', host, port, err)

      socket.close(1008)
      maConn.timeline.close = Date.now()
    },

    log
  }

  socket.addEventListener('close', () => {
    // In instances where `close` was not explicitly called, such as an
    // iterable stream ending, ensure we have set the close timeline.
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  }, { once: true })

  return maConn
}
