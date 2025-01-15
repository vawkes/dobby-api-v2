import { handle } from 'hono/aws-lambda'
import devices from './devices/devices'
import events from './events/events'
import { Hono } from 'hono'
import { openAPISpecs } from 'hono-openapi';
import { apiReference } from "@scalar/hono-api-reference";


const app = new Hono()

app.route('/devices', devices)
app.route('/events', events)

app.get(
    '/openapi',
    openAPISpecs(app, {
        documentation: {
            info: { title: 'Vawkes GridCube API', version: '1.0.0', description: 'API for interacting with Vawkes GridCube devices.' },
            servers: [],
        },
    })
);

app.get(
    '/docs',
    apiReference({
        theme: 'saturn',
        spec: { url: '/prod/openapi' },
    })
);

export const handler = handle(app)