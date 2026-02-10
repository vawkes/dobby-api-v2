import { handle } from 'hono/aws-lambda'
import { createApp } from './app'

// AWS Lambda entrypoint.
export const handler = handle(createApp())

