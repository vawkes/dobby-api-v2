import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { devicesSchema, deviceSchema } from './devicesSchema';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod'

const app = new Hono()

app.get('/',
    describeRoute({
        description: "Fetch all devices",
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(devicesSchema),
                    },
                },
                description: 'Retrieve List of Devices',
            },
        },
    }),
    async (c) => {
        const dynamodb = new DynamoDB({ "region": "us-east-1" });
        const results = await dynamodb.scan({ TableName: "DobbyInfo" });
        const devices = results.Items?.map(item => unmarshall(item)) || [];
        return c.json(devicesSchema.parse(devices));
    })

app.get('/:deviceId',
    describeRoute({
        description: "Fetch single device",
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(deviceSchema),
                    },
                },
                description: 'Retrieve a single device',
            },
            404: {
                description: 'Device not found',
            },
            500: {
                description: 'Internal server error',
            },
        },
    }),
    async (c) => {
        try {
            const deviceId = c.req.param('deviceId');
            const dynamodb = new DynamoDB({ "region": "us-east-1" });
            const result = await dynamodb.getItem({
                TableName: "DobbyInfo", Key: {
                    'device_id': { S: deviceId } // Assuming device_id is a string
                }
            });

            if (!result.Item) {
                return c.json({ error: 'Device not found' }, 404);
            }

            const device = unmarshall(result.Item);
            return c.json(deviceSchema.parse(device));
        } catch (error) {
            console.error('Error fetching device:', error);
            return c.json({ error: 'Internal server error' }, 500);
        }
    })

export default app