import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { devicesSchema, deviceSchema, deviceDataSchema } from './devicesSchema';
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
            const devices = results.Items?.map(item => {
                const device = unmarshall(item);

                // Convert string values to numbers for fields expected to be numbers
                if (device.last_rx_rssi !== undefined && typeof device.last_rx_rssi === 'string') {
                    device.last_rx_rssi = Number(device.last_rx_rssi);
                }

                if (device.last_link_type !== undefined && typeof device.last_link_type === 'string') {
                    device.last_link_type = Number(device.last_link_type);
                }

                return device;
            }) || [];

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

            // Convert string values to numbers for fields expected to be numbers
            if (device.last_rx_rssi !== undefined && typeof device.last_rx_rssi === 'string') {
                device.last_rx_rssi = Number(device.last_rx_rssi);
            }

            if (device.last_link_type !== undefined && typeof device.last_link_type === 'string') {
                device.last_link_type = Number(device.last_link_type);
            }

            return c.json(deviceSchema.parse(device));
        } catch (error) {
            console.error('Error fetching device:', error);
            return c.json({ error: 'Internal server error' }, 500);
        }
    })

app.get('/:deviceId/data',
    describeRoute({
        description: "Fetch device data from ShiftedData table",
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(deviceDataSchema),
                    },
                },
                description: 'Retrieve device time series data',
            },
            404: {
                description: 'Device not found or no data available',
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

            // Get the timeframe from query parameters (default to last 24 hours)
            const days = parseInt(c.req.query('days') || '1');
            const currentTime = new Date();
            const startTime = new Date(currentTime);
            startTime.setDate(startTime.getDate() - days);

            // Convert to seconds since epoch for comparison with timestamp
            const startTimeSeconds = Math.floor(startTime.getTime() / 1000);

            // Query the ShiftedData table
            const queryParams = {
                TableName: "ShiftedData",
                KeyConditionExpression: "device_id = :deviceId AND #ts >= :startTime",
                ExpressionAttributeValues: {
                    ":deviceId": { S: deviceId },
                    ":startTime": { N: startTimeSeconds.toString() }
                },
                ExpressionAttributeNames: {
                    "#ts": "timestamp"  // Use expression attribute name for reserved keyword
                },
                ScanIndexForward: true // Return items in ascending order by sort key
            };

            const results = await dynamodb.query(queryParams);

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: 'No data found for this device' }, 404);
            }

            const deviceData = results.Items.map(item => {
                const data = unmarshall(item);

                // Ensure numeric fields are converted to numbers
                return {
                    device_id: data.device_id,
                    timestamp: Number(data.timestamp),
                    cumulative_energy: Number(data.cumulative_energy),
                    instant_power: Number(data.instant_power),
                    msg_number: Number(data.msg_number),
                    operational_state: Number(data.operational_state)
                };
            });

            return c.json(deviceDataSchema.parse(deviceData));
        } catch (error) {
            console.error('Error fetching device data:', error);
            return c.json({ error: 'Internal server error' }, 500);
        }
    })

export default app