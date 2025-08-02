import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { devicesSchema, deviceSchema, deviceDataSchema, deviceIdSchema } from './devicesSchema';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod'
import { QueryCommand } from "@aws-sdk/client-dynamodb";

const app = new Hono()

// Helper function to get wireless device ID from production line table
async function getWirelessDeviceId(dynamodb: DynamoDB, deviceId: string): Promise<string | null> {
    try {
        const result = await dynamodb.getItem({
            TableName: "ProductionLine",
            Key: {
                'device_id': { S: deviceId }
            }
        });

        if (!result.Item) {
            return null;
        }

        const item = unmarshall(result.Item);
        return item.wireless_device_id || null;
    } catch (error) {
        console.error('Error getting wireless device ID:', error);
        return null;
    }
}

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

            // Use safeParse for more resilient validation
            const parseResult = devicesSchema.safeParse(devices);

            if (!parseResult.success) {
                console.error('Schema validation failed:', parseResult.error);

                // Log details about the validation errors
                parseResult.error.issues.forEach((issue, index) => {
                    console.error(`Validation issue ${index + 1}:`, {
                        path: issue.path,
                        message: issue.message,
                        received: issue.received,
                        expected: issue.expected
                    });
                });

                // Return devices with partial validation - filter out invalid items
                const validDevices = devices.filter((device, index) => {
                    const singleDeviceResult = deviceSchema.safeParse(device);
                    if (!singleDeviceResult.success) {
                        console.warn(`Device at index ${index} failed validation:`, device);
                        return false;
                    }
                    return true;
                });

                console.log(`Returning ${validDevices.length} valid devices out of ${devices.length} total`);
                return c.json(validDevices);
            }

            return c.json(parseResult.data);
        } catch (error) {
            console.error('Error in device scan operation:', error);
            return c.json({ error: 'Failed to retrieve devices', details: error.message }, 500);
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

            // Validate device ID format
            const validationResult = deviceIdSchema.safeParse(deviceId);
            if (!validationResult.success) {
                return c.json({ error: 'Invalid device ID format' }, 400);
            }

            // If it's a 6-digit ID, look up the wireless device ID
            let wirelessDeviceId = null;
            if (/^\d{6}$/.test(deviceId)) {
                wirelessDeviceId = await getWirelessDeviceId(dynamodb, deviceId);
                if (!wirelessDeviceId) {
                    return c.json({ error: 'Device not found in production line' }, 404);
                }
            }

            // Use the wireless device ID if available, otherwise use the original device ID
            const lookupId = wirelessDeviceId || deviceId;
            const result = await dynamodb.getItem({
                TableName: "DobbyInfo",
                Key: {
                    'device_id': { S: lookupId }
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

            // Always return the original device ID in the response
            device.device_id = deviceId;

            // Use safeParse for more resilient validation
            const parseResult = deviceSchema.safeParse(device);

            if (!parseResult.success) {
                console.error('Device schema validation failed:', parseResult.error);
                console.error('Device data that failed validation:', device);

                // Log details about the validation errors
                parseResult.error.issues.forEach((issue, index) => {
                    console.error(`Validation issue ${index + 1}:`, {
                        path: issue.path,
                        message: issue.message,
                        received: issue.received,
                        expected: issue.expected
                    });
                });

                // Return the device data anyway but with a warning
                console.warn('Returning device data despite validation errors');
                return c.json({
                    ...device,
                    _validation_warnings: parseResult.error.issues.map(issue => issue.message)
                });
            }

            return c.json(parseResult.data);
        } catch (error) {
            console.error('Error fetching device:', error);
            return c.json({ error: 'Internal server error', details: error.message }, 500);
        }
    })

app.get('/:deviceId/data',
    describeRoute({
        description: "Fetch device data",
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(deviceDataSchema),
                    },
                },
                description: 'Successfully retrieved device time series data',
            },
            400: {
                description: 'Invalid device ID format',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Invalid device ID format'
                                }
                            }
                        }
                    }
                }
            },
            404: {
                description: 'Device not found or no data available',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Device not found in production line'
                                }
                            }
                        }
                    }
                }
            },
            500: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Internal server error'
                                }
                            }
                        }
                    }
                }
            },
        },
    }),
    async (c) => {
        try {
            const deviceId = c.req.param('deviceId');
            const dynamodb = new DynamoDB({ "region": "us-east-1" });

            // Validate device ID format
            const validationResult = deviceIdSchema.safeParse(deviceId);
            if (!validationResult.success) {
                return c.json({ error: 'Invalid device ID format' }, 400);
            }

            // If it's a 6-digit ID, look up the wireless device ID
            let wirelessDeviceId = null;
            if (/^\d{6}$/.test(deviceId)) {
                wirelessDeviceId = await getWirelessDeviceId(dynamodb, deviceId);
                if (!wirelessDeviceId) {
                    return c.json({ error: 'Device not found in production line' }, 404);
                }
            }

            // Get the timeframe from query parameters (default to last 24 hours)
            const days = parseInt(c.req.query('days') || '1');
            const currentTime = new Date();
            const startTime = new Date(currentTime);
            startTime.setDate(startTime.getDate() - days);

            // Convert to seconds since epoch for comparison with timestamp
            const startTimeSeconds = Math.floor(startTime.getTime() / 1000);

            // Use the wireless device ID if available, otherwise use the original device ID
            const lookupId = wirelessDeviceId || deviceId;

            // Query the DobbyData table
            const command = new QueryCommand({
                TableName: "DobbyData",
                KeyConditionExpression: "device_id = :deviceId AND #ts >= :startTime",
                ExpressionAttributeValues: {
                    ":deviceId": { S: lookupId },
                    ":startTime": { N: startTimeSeconds.toString() }
                },
                ExpressionAttributeNames: {
                    "#ts": "timestamp"  // Use expression attribute name for reserved keyword
                },
                ScanIndexForward: true // Return items in ascending order by sort key
            });

            const results = await dynamodb.query(command);

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: 'No data found for this device' }, 404);
            }

            const deviceData = results.Items.map(item => {
                const data = unmarshall(item);

                // Ensure numeric fields are converted to numbers
                return {
                    device_id: deviceId, // Always return the original device ID
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