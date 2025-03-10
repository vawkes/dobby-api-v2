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
        try {
            console.log('Starting device scan operation');
            const dynamodb = new DynamoDB({ region: "us-east-1" });

            // Use a limit to prevent retrieving too many items at once
            // and set a reasonable page size
            const scanParams = {
                TableName: "DobbyInfo",
                Limit: 100 // Only retrieve up to 100 devices at a time
            };

            console.log('Executing scan with params:', JSON.stringify(scanParams));
            const results = await dynamodb.scan(scanParams);

            console.log(`Scan complete. Retrieved ${results.Items?.length || 0} devices`);
            const devices = results.Items?.map(item => unmarshall(item)) || [];

            return c.json(devicesSchema.parse(devices));
        } catch (error) {
            console.error('Error in device scan operation:', error);
            return c.json({ error: 'Failed to retrieve devices' }, 500);
        }
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