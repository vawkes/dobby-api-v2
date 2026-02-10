import { Hono } from "hono";
import { createDynamoDBClient } from '../../shared/database/dynamodb';
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { eventsSchema, eventSchema, eventRequestSchema, bulkResponseSchema, EventType, EventSchemaType } from './eventsSchema.ts';
import { describeRoute } from 'hono-openapi';
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { getUserFromContext, getUserAccessibleDevices } from '../utils/deviceAccess.ts';
import { requirePermission, requireDevicePermission, Action } from '../utils/permissions.ts';
import { resolveDeviceIdForCommunication } from '../utils/deviceIdMapping.ts';
import { dispatchEventToDevice, EventRequestData } from './eventDispatcher.ts';

const app = new Hono();
const describeRouteCompat = (options: unknown) => describeRoute(options as never);

interface EventProcessingOutcome {
    device_id: string;
    result: EventSchemaType | null;
    error: string | null;
}

async function processEventForDevice(
    dynamodb: ReturnType<typeof createDynamoDBClient>,
    deviceId: string,
    eventType: EventType,
    eventData: EventRequestData
): Promise<EventProcessingOutcome> {
    try {
        const resolvedDeviceId = await resolveDeviceIdForCommunication(dynamodb, deviceId);
        const result = await dispatchEventToDevice(eventType, eventData, resolvedDeviceId);

        if (!result) {
            return {
                device_id: deviceId,
                result: null,
                error: 'Failed to process event',
            };
        }

        return {
            device_id: deviceId,
            result,
            error: null,
        };
    } catch (error) {
        return {
            device_id: deviceId,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

app.get("/",
    describeRouteCompat({
        tags: ['Events'],
        summary: 'Fetch all accessible events',
        description: 'Retrieves a list of all events associated with devices accessible to the authenticated user.',
        responses: {
            200: {
                description: "Retrieve List of Accessible Events",
                content: {
                    'application/json': {
                        schema: resolver(eventsSchema),
                        example: [
                            {
                                event_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                device_id: "000012",
                                event_type: "LOAD_UP",
                                timestamp: "2023-10-27T10:00:00Z",
                                event_data: {
                                    start_time: "2023-10-27T10:00:00Z",
                                    duration: 3600
                                },
                                event_ack: false
                            }
                        ]
                    },
                },
            },
            401: {
                description: 'User not authenticated',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: "Internal Server Error",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    requirePermission(Action.READ_EVENTS),
    async (c) => {
        try {
            const dynamodb = createDynamoDBClient();

            // Get user from context (set by auth middleware)
            const user = getUserFromContext(c);
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            // Get user's accessible devices
            const accessibleDeviceIds = await getUserAccessibleDevices(dynamodb, user.sub);

            if (accessibleDeviceIds.length === 0) {
                return c.json([]);
            }

            const results = await dynamodb.scan({ TableName: "DobbyEvent" });

            // Transform the data to ensure it matches the schema
            const allEvents = results.Items?.map(item => {
                const event = unmarshall(item);

                // Make sure event_data exists and has the necessary structure
                if (!event.event_data) {
                    event.event_data = {
                        device_id: event.device_id || ''
                    };

                    // Add appropriate fields based on event type
                    if (event.event_type === EventType.INFO_REQUEST) {
                        event.event_data.timestamp = event.timestamp || new Date().toISOString();
                    } else if (['LOAD_UP', 'GRID_EMERGENCY', 'CRITICAL_PEAK', 'START_SHED', 'END_SHED', 'CUSTOMER_OVERRIDE'].includes(event.event_type)) {
                        event.event_data.start_time = event.start_time || new Date().toISOString();

                        // Add duration for event types that need it
                        if (['LOAD_UP', 'START_SHED'].includes(event.event_type)) {
                            event.event_data.duration = event.duration || 0;
                        }
                    }
                }

                // Copy event_ack directly to the top level of the event
                if (event.event_ack === undefined) {
                    event.event_ack = false;
                }

                return event;
            }) || [];

            // Filter events to only include those for devices accessible to the user
            const accessibleEvents = allEvents.filter(event =>
                accessibleDeviceIds.includes(event.device_id)
            );

            return c.json(eventsSchema.parse(accessibleEvents));
        } catch (error) {
            console.error("Error fetching events:", error);
            return c.json({ error: "Failed to fetch events" }, 500);
        }
    })

app.get("/device/:deviceId",
    describeRouteCompat({
        tags: ['Events'],
        summary: 'Fetch events for a specific device',
        description: 'Retrieves a list of events for a given device, identified by its 6-digit ID, if accessible to the authenticated user.',
        responses: {
            200: {
                description: "Retrieve events for a device",
                content: {
                    'application/json': {
                        schema: resolver(eventsSchema),
                        example: [
                            {
                                event_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                device_id: "000012",
                                event_type: "LOAD_UP",
                                timestamp: "2023-10-27T10:00:00Z",
                                event_data: {
                                    start_time: "2023-10-27T10:00:00Z",
                                    duration: 3600
                                },
                                event_ack: false
                            }
                        ]
                    },
                },
            },
            400: {
                description: 'Invalid device ID format or resolution failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            403: {
                description: "Access denied to this device",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            404: {
                description: "No events found for this device",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: "Internal Server Error",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    requireDevicePermission(Action.READ_EVENTS),
    async (c) => {
        try {
            const deviceId = c.req.param("deviceId");
            const dynamodb = createDynamoDBClient();

            // Resolve the device ID for communication (get wireless device ID if needed)
            let resolvedDeviceId = deviceId;
            try {
                resolvedDeviceId = await resolveDeviceIdForCommunication(dynamodb, deviceId);
                console.log(`Successfully resolved device ID ${deviceId} to wireless device ID: ${resolvedDeviceId}`);
            } catch (error) {
                console.error(`Failed to resolve device ID ${deviceId} to wireless device ID:`, error);
                // If resolution fails, we can't query events since they're stored with wireless device IDs
                return c.json({ error: `Device ID ${deviceId} could not be resolved. Please check if the device exists.` }, 400);
            }

            // Query the GSI (device_id) using the resolved wireless device ID
            const queryParams = {
                TableName: "DobbyEvent",
                IndexName: "device_id-index",
                KeyConditionExpression: "device_id = :deviceId",
                ExpressionAttributeValues: {
                    ":deviceId": { S: resolvedDeviceId }
                }
            };

            console.log(`Querying events for device ID: ${deviceId}, resolved to wireless device ID: ${resolvedDeviceId}`);
            const results = await dynamodb.query(queryParams);
            console.log(`Query results: ${results.Items?.length || 0} items found`);

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: "No events found for this device" }, 404);
            }

            // Transform the data to ensure it matches the schema
            const events = results.Items.map(item => {
                const event = unmarshall(item);

                // Make sure event_data exists and has the necessary structure
                if (!event.event_data) {
                    event.event_data = {
                        device_id: deviceId // Use the original 6-digit device ID for the response
                    };

                    // Add appropriate fields based on event type
                    if (event.event_type === EventType.INFO_REQUEST) {
                        event.event_data.timestamp = event.timestamp || new Date().toISOString();
                    } else if (['LOAD_UP', 'GRID_EMERGENCY', 'CRITICAL_PEAK', 'START_SHED', 'END_SHED', 'CUSTOMER_OVERRIDE'].includes(event.event_type)) {
                        event.event_data.start_time = event.start_time || new Date().toISOString();

                        // Add duration for event types that need it
                        if (['LOAD_UP', 'START_SHED'].includes(event.event_type)) {
                            event.event_data.duration = event.duration || 0;
                        }
                    }
                }

                // Copy event_ack directly to the top level of the event 
                // This is for the frontend to have easy access to this field
                if (event.event_ack === undefined) {
                    event.event_ack = false;
                }

                return event;
            });

            return c.json(eventsSchema.parse(events));
        } catch (error) {
            console.error("Error fetching device events:", error);
            return c.json({ error: "Failed to fetch device events" }, 500);
        }
    })

app.get("/:eventId",
    describeRouteCompat({
        tags: ['Events'],
        summary: 'Fetch a single event by ID',
        description: 'Retrieves details for a specific event, identified by its unique event ID, if accessible to the authenticated user.',
        parameters: [
            {
                name: 'eventId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                description: 'The unique identifier of the event to retrieve.',
                example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
            }
        ],
        responses: {
            200: {
                description: "Retrieve a single event",
                content: {
                    'application/json': {
                        schema: resolver(eventSchema),
                        example: {
                            event_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                            device_id: "000012",
                            event_type: "LOAD_UP",
                            timestamp: "2023-10-27T10:00:00Z",
                            event_data: {
                                start_time: "2023-10-27T10:00:00Z",
                                duration: 3600
                            },
                            event_ack: false
                        }
                    },
                },
            },
            401: {
                description: 'User not authenticated',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            404: {
                description: "Event not found",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: "Internal Server Error",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    requirePermission(Action.READ_EVENTS),
    async (c) => {
        try {
            const dynamodb = createDynamoDBClient();
            const results = await dynamodb.query({
                TableName: "DobbyEvent",
                KeyConditionExpression: "event_id = :eventId",
                ExpressionAttributeValues: {
                    ":eventId": { S: c.req.param("eventId") }
                },
                Limit: 1,
                ScanIndexForward: false
            });

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: "Event not found" }, 404);
            }

            const event = unmarshall(results.Items[0]);

            // Make sure event_data exists and has the necessary structure
            if (!event.event_data) {
                event.event_data = {
                    device_id: event.device_id || ''
                };

                // Add appropriate fields based on event type
                if (event.event_type === EventType.INFO_REQUEST) {
                    event.event_data.timestamp = event.timestamp || new Date().toISOString();
                } else if (['LOAD_UP', 'GRID_EMERGENCY', 'CRITICAL_PEAK', 'START_SHED', 'END_SHED', 'CUSTOMER_OVERRIDE'].includes(event.event_type)) {
                    event.event_data.start_time = event.start_time || new Date().toISOString();

                    // Add duration for event types that need it
                    if (['LOAD_UP', 'START_SHED'].includes(event.event_type)) {
                        event.event_data.duration = event.duration || 0;
                    }
                }
            }

            // Copy event_ack directly to the top level of the event
            if (event.event_ack === undefined) {
                event.event_ack = false;
            }

            return c.json(eventSchema.parse(event));
        } catch (error) {
            console.error("Error fetching event:", error);
            return c.json({ error: "Failed to fetch event" }, 500);
        }
    })

app.post("/",
    // NOTE: zValidator attaches its own OpenAPI requestBody. We place describeRoute AFTER zValidator
    // so our requestBody docs (examples + CTA-2045 notes) win in the generated OpenAPI spec.
    requirePermission(Action.CREATE_EVENTS),
    zValidator('json', eventRequestSchema),
    describeRouteCompat({
        tags: ['Events'],
        summary: 'Create one or multiple events',
        description: `Creates a new event (command) or a batch of events for one or more devices. The \`event_data\` structure varies by \`event_type\`.

Notes:
- For CTA-2045 Advanced Load Up, use \`event_type: ADVANCED_LOAD_UP\` and provide CTA fields in \`event_data\` (including \`value\`, \`units\`, and \`event_data.event_id\`).
- \`LOAD_UP.duration\` is interpreted as seconds, but \`ADVANCED_LOAD_UP.duration\` is interpreted as minutes.
- Advanced Load Up has two IDs: the top-level \`event_id\` (API request ID) and \`event_data.event_id\` (CTA Event ID sent to the device). Recommended: reuse the same UUID for both.`,
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(eventRequestSchema),
                    examples: {
                        loadUpSingleDevice: {
                            summary: 'Load Up Event for a Single Device',
                            value: {
                                event_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                event_type: "LOAD_UP",
                                event_data: {
                                    device_id: "000012",
                                    start_time: "2023-10-27T10:00:00Z",
                                    duration: 3600
                                }
                            }
                        },
                        loadUpMultipleDevices: {
                            summary: 'Load Up Event for Multiple Devices',
                            value: {
                                event_id: "b2c3d4e5-f6a7-8901-2345-67890abcdef0",
                                event_type: "LOAD_UP",
                                event_data: {
                                    device_id: ["000012", "000013"],
                                    start_time: "2023-10-27T11:00:00Z",
                                    duration: 7200
                                }
                            }
                        },
                        infoRequest: {
                            summary: 'Info Request Event',
                            value: {
                                event_id: "c3d4e5f6-a7b8-9012-3456-7890abcdef01",
                                event_type: "INFO_REQUEST",
                                event_data: {
                                    device_id: "000012",
                                    timestamp: "2023-10-27T12:00:00Z"
                                }
                            }
                        },
                        advancedLoadUpKwh: {
                            summary: 'CTA-2045 Advanced Load Up (example: minimum +3 kWh above normal)',
                            value: {
                                event_id: "8d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
                                event_type: "ADVANCED_LOAD_UP",
                                event_data: {
                                    device_id: "000012",
                                    start_time: "2026-02-10T20:00:00Z",
                                    duration: 120,
                                    value: 3,
                                    units: 3,
                                    suggested_load_up_efficiency: 0,
                                    event_id: "8d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
                                    start_randomization: 0,
                                    end_randomization: 0
                                }
                            }
                        },
                        advancedLoadUpNoEffect: {
                            summary: 'CTA-2045 Advanced Load Up (no-effect / capability check)',
                            value: {
                                event_id: "9d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
                                event_type: "ADVANCED_LOAD_UP",
                                event_data: {
                                    device_id: "000012",
                                    start_time: "2026-02-10T20:00:00Z",
                                    duration: 15,
                                    value: 0,
                                    units: 255,
                                    suggested_load_up_efficiency: 0,
                                    event_id: "9d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
                                    start_randomization: 0,
                                    end_randomization: 0
                                }
                            }
                        }
                    }
                }
            }
        },
        responses: {
            200: {
                description: "Event(s) created successfully",
                content: {
                    'application/json': {
                        schema: resolver(bulkResponseSchema),
                        example: {
                            statusCode: 200,
                            body: {
                                successful_events: [
                                    {
                                        event_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                        device_id: "000012",
                                        event_type: "LOAD_UP",
                                        timestamp: "2023-10-27T10:00:00Z",
                                        event_data: {
                                            start_time: "2023-10-27T10:00:00Z",
                                            duration: 3600
                                        },
                                        event_ack: false
                                    }
                                ],
                                failed_events: []
                            }
                        }
                    },
                },
            },
            400: {
                description: "Bad Request - Invalid event data or unsupported event type",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            401: {
                description: 'User not authenticated',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            403: {
                description: 'Insufficient permissions to create events',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            500: {
                description: "Internal Server Error",
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
        },
        security: [{ bearerAuth: [] }] // This is a protected endpoint
    }),
    async (c) => {
        try {
            const parsedBody = c.req.valid('json');
            const eventType = parsedBody.event_type;
            const eventData = parsedBody.event_data as EventRequestData;

            const deviceIds = Array.isArray(eventData.device_id)
                ? eventData.device_id
                : [eventData.device_id];
            const dynamodb = createDynamoDBClient();

            const outcomes = await Promise.all(
                deviceIds.map(deviceId => processEventForDevice(dynamodb, deviceId, eventType, eventData))
            );

            const successfulEvents = outcomes
                .filter((outcome): outcome is EventProcessingOutcome & { result: EventSchemaType } => outcome.result !== null)
                .map(outcome => outcome.result);
            const failedEvents = outcomes
                .filter((outcome): outcome is EventProcessingOutcome & { error: string } => outcome.error !== null)
                .map(outcome => ({
                    device_id: outcome.device_id,
                    error: outcome.error
                }));

            if (deviceIds.length === 1 && failedEvents.length > 0) {
                return c.json({
                    statusCode: 500,
                    body: { reason: failedEvents[0].error }
                }, 500);
            }

            return c.json({
                statusCode: 200,
                body: {
                    successful_events: successfulEvents,
                    failed_events: failedEvents.length > 0 ? failedEvents : []
                }
            }, 200);
        } catch (error) {
            console.error("Error processing event:", error);
            return c.json({
                statusCode: 500,
                body: { reason: error instanceof Error ? error.message : "Unknown error" }
            }, 500);
        }
    })

export default app
