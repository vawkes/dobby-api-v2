import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { eventsSchema, eventSchema, eventRequestSchema, EventType, EventSchemaType } from './eventsSchema';
import { describeRoute } from 'hono-openapi';
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { handleLoadUp } from "./eventHandlers/loadUp";
import { handleStartShed } from "./eventHandlers/startShed";
import { handleEndShed } from "./eventHandlers/endShed";
import { handleGridEmergency } from "./eventHandlers/gridEmergency";
import { handleCriticalPeak } from "./eventHandlers/criticalPeak";
import { handleInfoRequest } from "./eventHandlers/infoRequest";

const app = new Hono()

app.get("/",
    describeRoute({
        description: "Fetch all events",
        responses: {
            200: {
                description: "Retrieve List of Events",
                content: {
                    'application/json': {
                        schema: resolver(eventsSchema),
                    },
                },
            },
            500: {
                description: "Internal Server Error",
            },
        },
    }),
    async (c) => {
        try {
            const dynamodb = new DynamoDB({ "region": "us-east-1" });
            const results = await dynamodb.scan({ TableName: "DobbyEvent" });

            // Transform the data to ensure it matches the schema
            const events = results.Items?.map(item => {
                const event = unmarshall(item);

                // Make sure event_data exists and has the necessary structure
                if (!event.event_data) {
                    event.event_data = {
                        device_id: event.device_id || ''
                    };

                    // Add appropriate fields based on event type
                    if (event.event_type === EventType.INFO_REQUEST) {
                        event.event_data.timestamp = event.timestamp || new Date().toISOString();
                    } else if (['LOAD_UP', 'GRID_EMERGENCY', 'CRITICAL_PEAK', 'START_SHED', 'END_SHED'].includes(event.event_type)) {
                        event.event_data.start_time = event.start_time || new Date().toISOString();

                        // Add duration for event types that need it
                        if (['LOAD_UP', 'START_SHED'].includes(event.event_type)) {
                            event.event_data.duration = event.duration || 0;
                        }
                    }
                }

                return event;
            }) || [];

            return c.json(eventsSchema.parse(events));
        } catch (error) {
            console.error("Error fetching events:", error);
            return c.json({ error: "Failed to fetch events" }, 500);
        }
    })

app.get("/device/:deviceId",
    describeRoute({
        description: "Fetch events for a specific device",
        responses: {
            200: {
                description: "Retrieve events for a device",
                content: {
                    'application/json': {
                        schema: resolver(eventsSchema),
                    },
                },
            },
            404: {
                description: "No events found for this device",
            },
            500: {
                description: "Internal Server Error",
            },
        },
    }),
    async (c) => {
        try {
            const deviceId = c.req.param("deviceId");
            const dynamodb = new DynamoDB({ "region": "us-east-1" });

            // Query the GSI (device_id)
            const queryParams = {
                TableName: "DobbyEvent",
                IndexName: "device_id-index",
                KeyConditionExpression: "device_id = :deviceId",
                ExpressionAttributeValues: {
                    ":deviceId": { S: deviceId }
                }
            };

            const results = await dynamodb.query(queryParams);

            if (!results.Items || results.Items.length === 0) {
                return c.json({ error: "No events found for this device" }, 404);
            }

            // Transform the data to ensure it matches the schema
            const events = results.Items.map(item => {
                const event = unmarshall(item);

                // Make sure event_data exists and has the necessary structure
                if (!event.event_data) {
                    event.event_data = {
                        device_id: event.device_id || deviceId
                    };

                    // Add appropriate fields based on event type
                    if (event.event_type === EventType.INFO_REQUEST) {
                        event.event_data.timestamp = event.timestamp || new Date().toISOString();
                    } else if (['LOAD_UP', 'GRID_EMERGENCY', 'CRITICAL_PEAK', 'START_SHED', 'END_SHED'].includes(event.event_type)) {
                        event.event_data.start_time = event.start_time || new Date().toISOString();

                        // Add duration for event types that need it
                        if (['LOAD_UP', 'START_SHED'].includes(event.event_type)) {
                            event.event_data.duration = event.duration || 0;
                        }
                    }
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
    describeRoute({
        description: "Fetch single event",
        responses: {
            200: {
                description: "Retrieve a single event",
                content: {
                    'application/json': {
                        schema: resolver(eventSchema),
                    },
                },
            },
            404: {
                description: "Event not found",
            },
            500: {
                description: "Internal Server Error",
            },
        },
    }),
    async (c) => {
        try {
            const dynamodb = new DynamoDB({ "region": "us-east-1" });
            const results = await dynamodb.getItem({ TableName: "DobbyEvent", Key: { event_id: { S: c.req.param("eventId") } } });
            if (!results.Item) {
                return c.json({ error: "Event not found" }, 404);
            }

            const event = unmarshall(results.Item);

            // Make sure event_data exists and has the necessary structure
            if (!event.event_data) {
                event.event_data = {
                    device_id: event.device_id || ''
                };

                // Add appropriate fields based on event type
                if (event.event_type === EventType.INFO_REQUEST) {
                    event.event_data.timestamp = event.timestamp || new Date().toISOString();
                } else if (['LOAD_UP', 'GRID_EMERGENCY', 'CRITICAL_PEAK', 'START_SHED', 'END_SHED'].includes(event.event_type)) {
                    event.event_data.start_time = event.start_time || new Date().toISOString();

                    // Add duration for event types that need it
                    if (['LOAD_UP', 'START_SHED'].includes(event.event_type)) {
                        event.event_data.duration = event.duration || 0;
                    }
                }
            }

            return c.json(eventSchema.parse(event));
        } catch (error) {
            console.error("Error fetching event:", error);
            return c.json({ error: "Failed to fetch event" }, 500);
        }
    })

app.post("/",
    describeRoute({
        description: "Create an event",
        responses: {
            200: {
                description: "Event created successfully",
                content: {
                    'application/json': {
                        schema: resolver(eventSchema),
                    },
                },
            },
            400: {
                description: "Bad Request",
            },
            500: {
                description: "Internal Server Error",
            },
        },
    }),
    zValidator('json', eventRequestSchema),
    async (c) => {
        try {
            const body = await c.req.json()
            const parsedBody = eventRequestSchema.parse(body)

            let result: EventSchemaType | null = null;
            const eventType = parsedBody.event_type;

            // Handle each event type
            if (eventType === EventType.LOAD_UP) {
                result = await handleLoadUp(parsedBody.event_data.device_id,
                    parsedBody.event_data.start_time ? new Date(parsedBody.event_data.start_time) : undefined,
                    parsedBody.event_data.duration);
            }
            else if (eventType === EventType.GRID_EMERGENCY) {
                result = await handleGridEmergency(parsedBody.event_data.device_id,
                    parsedBody.event_data.start_time ? new Date(parsedBody.event_data.start_time) : undefined);
            }
            else if (eventType === EventType.CRITICAL_PEAK) {
                result = await handleCriticalPeak(parsedBody.event_data.device_id,
                    parsedBody.event_data.start_time ? new Date(parsedBody.event_data.start_time) : undefined);
            }
            else if (eventType === EventType.START_SHED) {
                result = await handleStartShed(parsedBody.event_data.device_id,
                    parsedBody.event_data.start_time ? new Date(parsedBody.event_data.start_time) : undefined,
                    parsedBody.event_data.duration || 0);
            }
            else if (eventType === EventType.END_SHED) {
                result = await handleEndShed(parsedBody.event_data.device_id,
                    parsedBody.event_data.start_time ? new Date(parsedBody.event_data.start_time) : undefined);
            }
            else if (eventType === EventType.INFO_REQUEST) {
                result = await handleInfoRequest(parsedBody.event_data.device_id,
                    parsedBody.event_data.timestamp ? new Date(parsedBody.event_data.timestamp) : undefined);
            }
            else {
                // Unsupported event type
                return c.json({
                    statusCode: 400,
                    body: { reason: `Unsupported event type: ${eventType}` }
                }, 400);
            }

            if (!result) {
                return c.json({
                    statusCode: 500,
                    body: { reason: "Failed to process event" }
                }, 500);
            }

            return c.json({
                statusCode: 200,
                body: result
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