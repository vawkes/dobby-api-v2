import { Hono } from "hono";
import type { QueryCommandInput, QueryCommandOutput } from "@aws-sdk/client-dynamodb";
import { createDynamoDBClient } from '../../shared/database/dynamodb';
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { devicesSchema, deviceSchema, deviceDataSchema, deviceIdSchema } from './devicesSchema.ts';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod'
import { getUserFromContext, getUserAccessibleDeviceAssignments, getUserDeviceAssignment } from '../utils/deviceAccess.ts';
import { requirePermission, requireDevicePermission, Action } from '../utils/permissions.ts';
import { resolveDeviceIdForCommunication } from '../utils/deviceIdMapping.ts';
import { buildPendingInstallDevice, resolveEffectiveAssignmentStatus } from '../utils/deviceLifecycle.ts';

// Type for validation error issues
interface ValidationIssue {
    path: (string | number)[];
    message: string;
    received?: unknown;
    expected?: unknown;
}

const DEVICE_DATA_FIELDS = ['cumulative_energy', 'instant_power', 'msg_number', 'operational_state'] as const;
type DeviceDataField = typeof DEVICE_DATA_FIELDS[number];

interface ParsedIntegerQueryParam {
    value?: number;
    error?: string;
}

interface DeviceDataQueryOptions {
    startTime: number;
    endTime?: number;
    limit?: number;
    order: 'asc' | 'desc';
    fields?: DeviceDataField[];
}

const app = new Hono()
const describeRouteCompat = (options: unknown) => describeRoute(options as never);

// Transform DynamoDB fields to API schema fields
const transformDeviceData = (device: any) => {
    // Map rssi to last_rx_rssi and convert to number
    if (device.rssi !== undefined) {
        device.last_rx_rssi = Number(device.rssi);
        delete device.rssi;
    }

    // Map Sidewalk metadata RSSI separately from device-reported RSSI
    if (device.sidewalk_rssi !== undefined) {
        device.last_sidewalk_rssi = Number(device.sidewalk_rssi);
        delete device.sidewalk_rssi;
    }
    
    // Map link_type to last_link_type and convert to number
    if (device.link_type !== undefined) {
        device.last_link_type = Number(device.link_type);
        delete device.link_type;
    }
    
    // Convert other string values to numbers for fields expected to be numbers
    if (device.last_rx_rssi !== undefined && typeof device.last_rx_rssi === 'string') {
        device.last_rx_rssi = Number(device.last_rx_rssi);
    }

    if (device.last_sidewalk_rssi !== undefined && typeof device.last_sidewalk_rssi === 'string') {
        device.last_sidewalk_rssi = Number(device.last_sidewalk_rssi);
    }
    
    if (device.last_link_type !== undefined && typeof device.last_link_type === 'string') {
        device.last_link_type = Number(device.last_link_type);
    }
    
    return device;
};

const getQueryAlias = (query: (name: string) => string | undefined, names: string[]): string | undefined => {
    for (const name of names) {
        const value = query(name);
        if (value !== undefined) {
            return value;
        }
    }

    return undefined;
};

const parseIntegerQueryParam = (
    rawValue: string | undefined,
    name: string,
    minimum: number,
    maximum: number
): ParsedIntegerQueryParam => {
    if (rawValue === undefined) {
        return {};
    }

    if (!/^\d+$/.test(rawValue)) {
        return { error: `${name} must be an integer` };
    }

    const value = Number(rawValue);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        return { error: `${name} must be between ${minimum} and ${maximum}` };
    }

    return { value };
};

const parseDeviceDataFields = (rawFields: string | undefined): { fields?: DeviceDataField[]; error?: string } => {
    if (rawFields === undefined || rawFields.trim() === '') {
        return {};
    }

    const requestedFields = rawFields
        .split(',')
        .map(field => field.trim())
        .filter(field => field.length > 0);

    const invalidFields = requestedFields.filter(
        field => !DEVICE_DATA_FIELDS.includes(field as DeviceDataField)
    );

    if (invalidFields.length > 0) {
        return {
            error: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${DEVICE_DATA_FIELDS.join(', ')}`
        };
    }

    return {
        fields: Array.from(new Set(requestedFields)) as DeviceDataField[]
    };
};

const parseDeviceDataQueryOptions = (query: (name: string) => string | undefined): { options?: DeviceDataQueryOptions; error?: string } => {
    const rawStartTime = getQueryAlias(query, ['start_time', 'startTime']);
    const rawEndTime = getQueryAlias(query, ['end_time', 'endTime']);
    const rawLimit = query('limit');
    const rawDays = query('days');
    const rawOrder = getQueryAlias(query, ['order', 'sort']) || 'asc';

    if (rawOrder !== 'asc' && rawOrder !== 'desc') {
        return { error: 'order must be asc or desc' };
    }

    const startTimeResult = parseIntegerQueryParam(rawStartTime, 'start_time', 0, Number.MAX_SAFE_INTEGER);
    if (startTimeResult.error) {
        return { error: startTimeResult.error };
    }

    const endTimeResult = parseIntegerQueryParam(rawEndTime, 'end_time', 0, Number.MAX_SAFE_INTEGER);
    if (endTimeResult.error) {
        return { error: endTimeResult.error };
    }

    const limitResult = parseIntegerQueryParam(rawLimit, 'limit', 1, 10000);
    if (limitResult.error) {
        return { error: limitResult.error };
    }

    const fieldsResult = parseDeviceDataFields(query('fields'));
    if (fieldsResult.error) {
        return { error: fieldsResult.error };
    }

    let startTime = startTimeResult.value;
    const endTime = endTimeResult.value;

    if (startTime === undefined) {
        if (endTime !== undefined) {
            startTime = 0;
        } else {
            const daysResult = parseIntegerQueryParam(rawDays || '1', 'days', 1, 365);
            if (daysResult.error) {
                return { error: daysResult.error };
            }

            const currentTime = new Date();
            const startDate = new Date(currentTime);
            startDate.setDate(startDate.getDate() - (daysResult.value || 1));
            startTime = Math.floor(startDate.getTime() / 1000);
        }
    }

    if (endTime !== undefined && startTime > endTime) {
        return { error: 'start_time must be less than or equal to end_time' };
    }

    return {
        options: {
            startTime,
            endTime,
            limit: limitResult.value,
            order: rawOrder,
            fields: fieldsResult.fields
        }
    };
};

const toFiniteNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
};

const appendDeviceDataField = (
    target: Record<string, string | number>,
    source: Record<string, unknown>,
    field: DeviceDataField,
    selectedFields?: DeviceDataField[]
) => {
    if (selectedFields && !selectedFields.includes(field)) {
        return;
    }

    const value = toFiniteNumber(source[field]);
    if (value !== undefined) {
        target[field] = value;
    }
};


app.get('/',
    describeRouteCompat({
        tags: ['Devices'],
        summary: 'Fetch all accessible devices',
        description: 'Retrieves a list of all devices that the authenticated user has access to.',
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(devicesSchema),
                        example: [
                            {
                                updated_at: "2023-10-27T10:00:00Z",
                                cta_version: "1.0.0",
                                firmware_date: "2023-01-15",
                                model_number: "GC-1000",
                                device_id: "000012",
                                device_type: "GridCube",
                                gridcube_firmware_version: "2.0.0",
                                capability_bitmap: "0011",
                                device_revision: "A",
                                firmware_version: "1.0.0",
                                serial_number: "SN12345",
                                vendor_id: "VNDR",
                                last_rx_rssi: -70,
                                last_link_type: 4
                            }
                        ]
                    },
                },
                description: 'Retrieve List of Accessible Devices',
            },
            401: {
                description: 'User not authenticated',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: 'Internal server error',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    requirePermission(Action.READ_DEVICES),
    async (c) => {
        try {
            console.log('Starting device fetch operation');
            const dynamodb = createDynamoDBClient();

            // Get user from context (set by auth middleware)
            const user = getUserFromContext(c);
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            // Get user's accessible device assignments (6-digit device IDs)
            const accessibleAssignments = await getUserAccessibleDeviceAssignments(dynamodb, user.sub);

            if (accessibleAssignments.length === 0) {
                return c.json([]);
            }

            console.log(`User has access to ${accessibleAssignments.length} devices:`, accessibleAssignments.map(assignment => assignment.device_id));

            // Resolve 6-digit device IDs to wireless device IDs for database lookup
            const accessibleWirelessDeviceIds: string[] = [];
            const assignmentByWirelessDeviceId = new Map<string, typeof accessibleAssignments[number]>();
            for (const assignment of accessibleAssignments) {
                const wirelessDeviceId = await resolveDeviceIdForCommunication(dynamodb, assignment.device_id);
                if (wirelessDeviceId) {
                    accessibleWirelessDeviceIds.push(wirelessDeviceId);
                    assignmentByWirelessDeviceId.set(wirelessDeviceId, assignment);
                }
            }

            console.log(`Resolved to ${accessibleWirelessDeviceIds.length} wireless device IDs:`, accessibleWirelessDeviceIds);

            // Use batchGetItem to fetch only the devices the user has access to
            // DynamoDB batchGetItem can handle up to 100 items per request
            const batchSize = 100;
            const deviceByWirelessDeviceId = new Map<string, any>();

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
                        return transformDeviceData(device);
                    });

                    for (const device of batchDevices) {
                        deviceByWirelessDeviceId.set(device.device_id, device);
                    }
                }

                // Handle unprocessed keys if any (shouldn't happen with our batch size)
                if (batchResults.UnprocessedKeys && Object.keys(batchResults.UnprocessedKeys).length > 0) {
                    console.warn('Some items were not processed:', batchResults.UnprocessedKeys);
                }
            }

            console.log(`Retrieved ${deviceByWirelessDeviceId.size} devices from database`);

            const resolvedDevices = accessibleAssignments.flatMap((assignment) => {
                const wirelessDeviceId = accessibleWirelessDeviceIds.find(id => assignmentByWirelessDeviceId.get(id)?.device_id === assignment.device_id);
                const device = wirelessDeviceId ? deviceByWirelessDeviceId.get(wirelessDeviceId) : undefined;

                if (!device) {
                    const pendingDevice = buildPendingInstallDevice(assignment.device_id, assignment.status);
                    return pendingDevice.effective_assignment_status === 'PENDING_INSTALL' ? [pendingDevice] : [];
                }

                return [{
                    ...device,
                    device_id: assignment.device_id,
                    assignment_status: assignment.status,
                    effective_assignment_status: resolveEffectiveAssignmentStatus(assignment.status, device.updated_at)
                }];
            });

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
    describeRouteCompat({
        tags: ['Devices'],
        summary: 'Fetch a single accessible device',
        description: 'Retrieves details for a specific device, identified by its 6-digit ID, if accessible to the authenticated user.',
        parameters: [
            {
                name: 'deviceId',
                in: 'path',
                required: true,
                schema: { type: 'string', pattern: '^\\d{6}$' },
                description: 'The 6-digit identifier of the device to retrieve.',
                example: '000012'
            }
        ],
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: resolver(deviceSchema),
                        example: {
                            updated_at: "2023-10-27T10:00:00Z",
                            cta_version: "1.0.0",
                            firmware_date: "2023-01-15",
                            model_number: "GC-1000",
                            device_id: "000012",
                            device_type: "GridCube",
                            gridcube_firmware_version: "2.0.0",
                            capability_bitmap: "0011",
                            device_revision: "A",
                            firmware_version: "1.0.0",
                            serial_number: "SN12345",
                            vendor_id: "VNDR",
                            last_rx_rssi: -70,
                            last_link_type: 4
                        }
                    },
                },
                description: 'Retrieve a single device',
            },
            400: {
                description: 'Invalid device ID format',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            403: {
                description: 'Access denied to this device',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            404: {
                description: 'Device not found',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: 'Internal server error',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    requireDevicePermission(Action.READ_DEVICES),
    async (c) => {
        try {
            const deviceId = c.req.param('deviceId');
            const dynamodb = createDynamoDBClient();

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

            const user = getUserFromContext(c);
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            const assignment = await getUserDeviceAssignment(dynamodb, user.sub, deviceId);

            if (!result.Item) {
                const pendingDevice = buildPendingInstallDevice(deviceId, assignment?.status);
                if (pendingDevice.effective_assignment_status === 'PENDING_INSTALL') {
                    return c.json(pendingDevice);
                }

                return c.json({ error: 'Device not found' }, 404);
            }

            const device = unmarshall(result.Item);
            const transformedDevice = transformDeviceData(device);

            // Always return the original device ID in the response
            transformedDevice.device_id = deviceId;
            transformedDevice.assignment_status = assignment?.status;
            transformedDevice.effective_assignment_status = resolveEffectiveAssignmentStatus(assignment?.status, transformedDevice.updated_at);

            // Use safeParse for more resilient validation
            const singleDeviceParseResult = deviceSchema.safeParse(transformedDevice);

            if (!singleDeviceParseResult.success) {
                console.error('Device schema validation failed:', singleDeviceParseResult.error);
                console.error('Device data that failed validation:', transformedDevice);

                // Log details about the validation errors
                singleDeviceParseResult.error.issues.forEach((issue: ValidationIssue, index: number) => {
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
                    ...transformedDevice,
                    _validation_warnings: singleDeviceParseResult.error.issues.map((issue: ValidationIssue) => issue.message)
                });
            }

            return c.json(singleDeviceParseResult.data);
        } catch (error) {
            console.error('Error fetching device:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return c.json({ error: 'Internal server error', details: errorMessage }, 500);
        }
    })

app.get('/:deviceId/data',
    describeRouteCompat({
        tags: ['Devices'],
        summary: 'Get device time series data',
        description: 'Fetch historical data points for a specific device with optional time range filtering.',
        parameters: [
            {
                name: 'deviceId',
                in: 'path',
                required: true,
                schema: { type: 'string', pattern: '^\\d{6}$' },
                description: '6-digit device identifier',
                example: '000012'
            },
            {
                name: 'days',
                in: 'query',
                required: false,
                schema: { type: 'integer', minimum: 1, maximum: 365, default: 1 },
                description: 'Number of days of historical data to retrieve when start_time is not provided (default: 1 day).',
                example: 7
            },
            {
                name: 'start_time',
                in: 'query',
                required: false,
                schema: { type: 'integer', minimum: 0 },
                description: 'Inclusive Unix timestamp lower bound. Overrides days when provided.',
                example: 1700000000
            },
            {
                name: 'end_time',
                in: 'query',
                required: false,
                schema: { type: 'integer', minimum: 0 },
                description: 'Inclusive Unix timestamp upper bound.',
                example: 1700003600
            },
            {
                name: 'limit',
                in: 'query',
                required: false,
                schema: { type: 'integer', minimum: 1, maximum: 10000 },
                description: 'Maximum number of data points to return.',
                example: 500
            },
            {
                name: 'order',
                in: 'query',
                required: false,
                schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
                description: 'Sort order by timestamp.',
                example: 'desc'
            },
            {
                name: 'fields',
                in: 'query',
                required: false,
                schema: { type: 'string' },
                description: 'Comma-separated telemetry fields to include. Allowed fields: cumulative_energy, instant_power, msg_number, operational_state.',
                example: 'instant_power,operational_state'
            }
        ],
        responses: {
            200: {
                description: 'Device data retrieved successfully',
                content: {
                    'application/json': {
                        schema: resolver(deviceDataSchema),
                        example: [
                            {
                                device_id: "000012",
                                timestamp: 1640995200,
                                cumulative_energy: 1234.5,
                                instant_power: 2500,
                                msg_number: 12345,
                                operational_state: 1
                            }
                        ]
                    }
                }
            },
            400: {
                description: 'Invalid device ID format',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            403: {
                description: 'Access denied to this device',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            404: {
                description: 'Device not found or no data available',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: 'Internal server error',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    requireDevicePermission(Action.READ_DEVICES),
    async (c) => {
        try {
            const deviceId = c.req.param('deviceId');
            const dynamodb = createDynamoDBClient();

            // Validate device ID format
            const validationResult = deviceIdSchema.safeParse(deviceId);
            if (!validationResult.success) {
                return c.json({ error: 'Invalid device ID format' }, 400);
            }

            // Resolve the device ID for communication (get wireless device ID if needed)
            const lookupId = await resolveDeviceIdForCommunication(dynamodb, deviceId);

            const parsedQuery = parseDeviceDataQueryOptions((name: string) => c.req.query(name));
            if (parsedQuery.error || !parsedQuery.options) {
                return c.json({ error: parsedQuery.error || 'Invalid query parameters' }, 400);
            }

            const queryParams: QueryCommandInput = {
                TableName: "DobbyData",
                KeyConditionExpression: parsedQuery.options.endTime === undefined
                    ? "device_id = :deviceId AND #ts >= :startTime"
                    : "device_id = :deviceId AND #ts BETWEEN :startTime AND :endTime",
                ExpressionAttributeValues: {
                    ":deviceId": { S: lookupId },
                    ":startTime": { N: parsedQuery.options.startTime.toString() }
                },
                ExpressionAttributeNames: {
                    "#ts": "timestamp"  // Use expression attribute name for reserved keyword
                },
                ScanIndexForward: parsedQuery.options.order === 'asc'
            };

            if (parsedQuery.options.endTime !== undefined) {
                queryParams.ExpressionAttributeValues![":endTime"] = {
                    N: parsedQuery.options.endTime.toString()
                };
            }

            if (parsedQuery.options.limit !== undefined) {
                queryParams.Limit = parsedQuery.options.limit;
            }

            // Query the DobbyData table
            const results = await dynamodb.query(queryParams) as QueryCommandOutput;

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: 'No data found for this device' }, 404);
            }

            const deviceData = results.Items.map((item: any) => {
                const data = unmarshall(item);
                const timestamp = toFiniteNumber(data.timestamp) || 0;
                const point: Record<string, string | number> = {
                    device_id: deviceId, // Always return the original device ID
                    timestamp
                };

                // Ensure numeric fields are converted to numbers, handling NaN values
                appendDeviceDataField(point, data, 'cumulative_energy', parsedQuery.options?.fields);
                appendDeviceDataField(point, data, 'instant_power', parsedQuery.options?.fields);
                appendDeviceDataField(point, data, 'msg_number', parsedQuery.options?.fields);
                appendDeviceDataField(point, data, 'operational_state', parsedQuery.options?.fields);

                return point;
            });

            return c.json(deviceDataSchema.parse(deviceData));
        } catch (error) {
            console.error('Error fetching device data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return c.json({ error: 'Internal server error', details: errorMessage }, 500);
        }
    })

export default app
