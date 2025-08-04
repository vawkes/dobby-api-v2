import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { devicesSchema, deviceSchema, deviceDataSchema, deviceIdSchema } from './devicesSchema.ts';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod'
import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { getUserFromContext, getUserAccessibleDevices, checkUserDeviceAccess, UserContext } from '../utils/deviceAccess.ts';
import { requirePermission, requireDevicePermission, Action } from '../utils/permissions.ts';
import { resolveDeviceIdForCommunication, resolveDeviceIdForResponse } from '../utils/deviceIdMapping.ts';

// Type for validation error issues
interface ValidationIssue {
    path: (string | number)[];
    message: string;
    received?: unknown;
    expected?: unknown;
}

const app = new Hono()



app.get('/',
    describeRoute({
        description: "Fetch all devices accessible to the authenticated user",
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(devicesSchema),
                    },
                },
                description: 'Retrieve List of Accessible Devices',
            },
        },
    }),
    requirePermission(Action.READ_DEVICES),
    async (c) => {
        try {
            console.log('Starting device fetch operation');
            const dynamodb = new DynamoDB({ region: "us-east-1" });

            // Get user from context (set by auth middleware)
            const user = getUserFromContext(c);
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            // Get user's accessible devices (6-digit device IDs)
            const accessibleDeviceIds = await getUserAccessibleDevices(dynamodb, user.sub);

            if (accessibleDeviceIds.length === 0) {
                return c.json([]);
            }

            console.log(`User has access to ${accessibleDeviceIds.length} devices:`, accessibleDeviceIds);

            // Resolve 6-digit device IDs to wireless device IDs for database lookup
            const accessibleWirelessDeviceIds: string[] = [];
            for (const deviceId of accessibleDeviceIds) {
                const wirelessDeviceId = await resolveDeviceIdForCommunication(dynamodb, deviceId);
                if (wirelessDeviceId) {
                    accessibleWirelessDeviceIds.push(wirelessDeviceId);
                }
            }

            if (accessibleWirelessDeviceIds.length === 0) {
                return c.json([]);
            }

            console.log(`Resolved to ${accessibleWirelessDeviceIds.length} wireless device IDs:`, accessibleWirelessDeviceIds);

            // Use batchGetItem to fetch only the devices the user has access to
            // DynamoDB batchGetItem can handle up to 100 items per request
            const batchSize = 100;
            const allDevices: any[] = [];

            for (let i = 0; i < accessibleWirelessDeviceIds.length; i += batchSize) {
                const batch = accessibleWirelessDeviceIds.slice(i, i + batchSize);
                
                const batchParams = {
                    RequestItems: {
                        "DobbyInfo": {
                            Keys: batch.map(deviceId => ({ device_id: { S: deviceId } }))
                        }
                    }
                };

                console.log(`Fetching batch ${Math.floor(i / batchSize) + 1} with ${batch.length} devices`);
                const batchResults = await dynamodb.batchGetItem(batchParams);

                if (batchResults.Responses?.DobbyInfo) {
                    const batchDevices = batchResults.Responses.DobbyInfo.map(item => {
                        const device = unmarshall(item);

                        // Convert string values to numbers for fields expected to be numbers
                        if (device.last_rx_rssi !== undefined && typeof device.last_rx_rssi === 'string') {
                            device.last_rx_rssi = Number(device.last_rx_rssi);
                        }

                        if (device.last_link_type !== undefined && typeof device.last_link_type === 'string') {
                            device.last_link_type = Number(device.last_link_type);
                        }

                        return device;
                    });

                    allDevices.push(...batchDevices);
                }

                // Handle unprocessed keys if any (shouldn't happen with our batch size)
                if (batchResults.UnprocessedKeys && Object.keys(batchResults.UnprocessedKeys).length > 0) {
                    console.warn('Some items were not processed:', batchResults.UnprocessedKeys);
                }
            }

            console.log(`Retrieved ${allDevices.length} devices from database`);

            // Resolve device IDs back to 6-digit format for response
            const resolvedDevices = await Promise.all(allDevices.map(async (device) => {
                const originalDeviceId = await resolveDeviceIdForResponse(dynamodb, device.device_id);
                return {
                    ...device,
                    device_id: originalDeviceId
                };
            }));

            console.log(`Resolved to ${resolvedDevices.length} devices with original device IDs`);

            // Use safeParse for more resilient validation
            const parseResult = devicesSchema.safeParse(resolvedDevices);

            if (!parseResult.success) {
                console.error('Schema validation failed:', parseResult.error);

                // Log details about the validation errors
                parseResult.error.issues.forEach((issue: ValidationIssue, index: number) => {
                    console.error(`Validation issue ${index + 1}:`, {
                        path: issue.path,
                        message: issue.message,
                        received: issue.received,
                        expected: issue.expected
                    });
                });

                // Return devices with partial validation - filter out invalid items
                const validDevices = resolvedDevices.filter((device, index) => {
                    const singleDeviceResult = deviceSchema.safeParse(device);
                    if (!singleDeviceResult.success) {
                        console.warn(`Device at index ${index} failed validation:`, device);
                        return false;
                    }
                    return true;
                });

                console.log(`Returning ${validDevices.length} valid devices out of ${resolvedDevices.length} total`);
                return c.json(validDevices);
            }

            return c.json(parseResult.data);
        } catch (error) {
            console.error('Error in device fetch operation:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return c.json({ error: 'Failed to retrieve devices', details: errorMessage }, 500);
        }
    })

app.get('/:deviceId',
    describeRoute({
        description: "Fetch single device if accessible to the authenticated user",
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(deviceSchema),
                    },
                },
                description: 'Retrieve a single device',
            },
            403: {
                description: 'Access denied to this device',
            },
            404: {
                description: 'Device not found',
            },
            500: {
                description: 'Internal server error',
            },
        },
    }),
    requireDevicePermission(Action.READ_DEVICES),
    async (c) => {
        try {
            const deviceId = c.req.param('deviceId');
            const dynamodb = new DynamoDB({ "region": "us-east-1" });

            // Validate device ID format
            const validationResult = deviceIdSchema.safeParse(deviceId);
            if (!validationResult.success) {
                return c.json({ error: 'Invalid device ID format' }, 400);
            }

            // Resolve the device ID for communication (get wireless device ID if needed)
            const lookupId = await resolveDeviceIdForCommunication(dynamodb, deviceId);
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
                parseResult.error.issues.forEach((issue: ValidationIssue, index: number) => {
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
                    _validation_warnings: parseResult.error.issues.map((issue: ValidationIssue) => issue.message)
                });
            }

            return c.json(parseResult.data);
        } catch (error) {
            console.error('Error fetching device:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return c.json({ error: 'Internal server error', details: errorMessage }, 500);
        }
    })

app.get('/:deviceId/data',
    describeRoute({
        description: "Fetch device data if accessible to the authenticated user",
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
            403: {
                description: 'Access denied to this device',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Access denied to this device'
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
    requireDevicePermission(Action.READ_DEVICES),
    async (c) => {
        try {
            const deviceId = c.req.param('deviceId');
            const dynamodb = new DynamoDB({ "region": "us-east-1" });

            // Validate device ID format
            const validationResult = deviceIdSchema.safeParse(deviceId);
            if (!validationResult.success) {
                return c.json({ error: 'Invalid device ID format' }, 400);
            }

            // Resolve the device ID for communication (get wireless device ID if needed)
            const lookupId = await resolveDeviceIdForCommunication(dynamodb, deviceId);

            // Get the timeframe from query parameters (default to last 24 hours)
            const days = parseInt(c.req.query('days') || '1');
            const currentTime = new Date();
            const startTime = new Date(currentTime);
            startTime.setDate(startTime.getDate() - days);

            // Convert to seconds since epoch for comparison with timestamp
            const startTimeSeconds = Math.floor(startTime.getTime() / 1000);

            // Query the DobbyData table
            const results = await dynamodb.query({
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

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: 'No data found for this device' }, 404);
            }

            const deviceData = results.Items.map((item: any) => {
                const data = unmarshall(item);

                // Helper function to safely convert to number, defaulting to 0 for NaN
                const safeNumber = (value: unknown): number => {
                    const num = Number(value);
                    return isNaN(num) ? 0 : num;
                };

                // Ensure numeric fields are converted to numbers, handling NaN values
                return {
                    device_id: deviceId, // Always return the original device ID
                    timestamp: safeNumber(data.timestamp),
                    cumulative_energy: safeNumber(data.cumulative_energy),
                    instant_power: safeNumber(data.instant_power),
                    msg_number: safeNumber(data.msg_number),
                    operational_state: safeNumber(data.operational_state)
                };
            });

            return c.json(deviceDataSchema.parse(deviceData));
        } catch (error) {
            console.error('Error fetching device data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return c.json({ error: 'Internal server error', details: errorMessage }, 500);
        }
    })

export default app