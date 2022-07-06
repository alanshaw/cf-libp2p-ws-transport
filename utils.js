import { EventIterator } from 'event-iterator'

/**
 * @typedef {import('@libp2p/interface-connection').MultiaddrConnection} MultiaddrConnection
 */

/**
 * @param {WebSocket} socket
 * @param {Multiaddr} remoteAddr
 * @returns {MultiaddrConnection}
 */
export function socketToMaConn (socket, remoteAddr) {
  /** @type {MultiaddrConnection} */
  const maConn = {
    async sink (source) {
      try {
        for await (const chunk of source) {
          socket.send(chunk)
        }
      } catch (err) {
        if (err.type !== 'aborted') {
          console.error(err)
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

    async close (err) {
      if (err) console.error(err)
      socket.close()
      maConn.timeline.close = Date.now()
    }
  }

  socket.addEventListener('close', () => {
    // In instances where `close` was not explicitly called, such as an
    // iterable stream ending, ensure we have set the close timeline.
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}
