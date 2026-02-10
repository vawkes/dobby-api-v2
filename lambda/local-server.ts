import { serve } from '@hono/node-server'
import { createApp } from './app'

const port = Number(process.env.PORT || 3333)
const app = createApp()

console.log(`Local server listening on http://127.0.0.1:${port}`)
serve({ fetch: app.fetch, port })

