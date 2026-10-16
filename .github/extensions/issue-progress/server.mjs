import http from 'node:http'
import { readFile } from 'node:fs/promises'

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/client.mjs', ['client.mjs', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
])

export async function startServer(store) {
  const server = http.createServer(async (request, response) => {
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors *; base-uri 'none'; form-action 'none'",
    }
    const host = `127.0.0.1:${server.address().port}`
    // Reject DNS rebinding and cross-origin reads; HTTP never accepts mutations.
    if (request.headers.host !== host || (request.headers.origin && request.headers.origin !== `http://${host}`)) {
      response.writeHead(403, headers).end('Forbidden')
      return
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { ...headers, Allow: 'GET' }).end('Method not allowed')
      return
    }
    try {
      if (request.url === '/api/state') {
        const state = await store.get()
        response.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' })
          .end(JSON.stringify(state))
      } else if (assets.has(request.url)) {
        const [file, type] = assets.get(request.url)
        const body = await readFile(new URL(file, import.meta.url))
        response.writeHead(200, { ...headers, 'Content-Type': type }).end(body)
      } else {
        response.writeHead(404, headers).end('Not found')
      }
    } catch (error) {
      response.writeHead(500, { ...headers, 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({ error: error.message }))
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  }
}
