import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { eventsSchema, eventSchema, eventRequestSchema, bulkResponseSchema, EventType, EventSchemaType } from './eventsSchema.ts';
import { describeRoute } from 'hono-openapi';
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { handleLoadUp } from "./eventHandlers/loadUp.ts";
import { handleStartShed } from "./eventHandlers/startShed.ts";
import { handleEndShed } from "./eventHandlers/endShed.ts";
import { handleGridEmergency } from "./eventHandlers/gridEmergency.ts";
import { handleCriticalPeak } from "./eventHandlers/criticalPeak.ts";
import { handleInfoRequest } from "./eventHandlers/infoRequest.ts";
import { handleAdvancedLoadUp } from "./eventHandlers/advancedLoadUp.ts";
import { v4 as uuidv4 } from 'uuid';

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

                // Copy event_ack directly to the top level of the event
                if (event.event_ack !== undefined) {
                    event.event_ack = event.event_ack;
                } else {
                    event.event_ack = false;
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

                // Copy event_ack directly to the top level of the event 
                // This is for the frontend to have easy access to this field
                if (event.event_ack !== undefined) {
                    event.event_ack = event.event_ack;
                } else {
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

            // Copy event_ack directly to the top level of the event
            if (event.event_ack !== undefined) {
                event.event_ack = event.event_ack;
            } else {
                event.event_ack = false;
            }

            return c.json(eventSchema.parse(event));
        } catch (error) {
            console.error("Error fetching event:", error);
            return c.json({ error: "Failed to fetch event" }, 500);
        }
    })

app.post("/",
    describeRoute({
        description: "Create event(s) for one or multiple devices",
        responses: {
            200: {
                description: "Event(s) created successfully",
                content: {
                    'application/json': {
                        schema: resolver(bulkResponseSchema),
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
            const body = await c.req.json();
            const parsedBody = eventRequestSchema.parse(body);

            let result: EventSchemaType | null = null;
            const eventType = parsedBody.event_type;
            const eventData = parsedBody.event_data;

            // Handle both single device_id and array of device_ids
            const deviceIds = Array.isArray(eventData.device_id)
                ? eventData.device_id
                : [eventData.device_id];

            // If only one device, handle as single operation
            if (deviceIds.length === 1) {
                const deviceId = deviceIds[0];

                // Create event with appropriate handler based on event type
                if (eventType === EventType.LOAD_UP) {
                    result = await handleLoadUp(
                        deviceId,
                        'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined,
                        'duration' in eventData ? eventData.duration : undefined
                    );
                }
                else if (eventType === EventType.GRID_EMERGENCY) {
                    result = await handleGridEmergency(
                        deviceId,
                        'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined
                    );
                }
                else if (eventType === EventType.CRITICAL_PEAK) {
                    result = await handleCriticalPeak(
                        deviceId,
                        'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined
                    );
                }
                else if (eventType === EventType.START_SHED) {
                    result = await handleStartShed(
                        deviceId,
                        'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined,
                        'duration' in eventData ? eventData.duration || 0 : 0
                    );
                }
                else if (eventType === EventType.END_SHED) {
                    result = await handleEndShed(
                        deviceId,
                        'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined
                    );
                }
                else if (eventType === EventType.INFO_REQUEST) {
                    result = await handleInfoRequest(
                        deviceId,
                        'timestamp' in eventData && eventData.timestamp ? new Date(eventData.timestamp) : undefined
                    );
                }
                else if (eventType === EventType.ADVANCED_LOAD_UP) {
                    result = await handleAdvancedLoadUp(
                        deviceId,
                        'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined,
                        'duration' in eventData ? eventData.duration : 0,
                        'value' in eventData ? eventData.value : 0,
                        'units' in eventData ? eventData.units : 0,
                        'suggested_load_up_efficiency' in eventData ? eventData.suggested_load_up_efficiency : 0,
                        'event_id' in eventData ? eventData.event_id : uuidv4(),
                        'start_randomization' in eventData ? eventData.start_randomization : 0,
                        'end_randomization' in eventData ? eventData.end_randomization : 0
                    );
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
                    body: {
                        successful_events: [result],
                        failed_events: []
                    }
                }, 200);
            }
            // Otherwise, handle as bulk operation
            else {
                const successfulEvents: EventSchemaType[] = [];
                const failedEvents: { device_id: string, error: string }[] = [];

                // Process events for each device in parallel
                await Promise.all(deviceIds.map(async (deviceId: string) => {
                    try {
                        let result: EventSchemaType | null = null;

                        // Create event with appropriate handler based on event type
                        if (eventType === EventType.LOAD_UP) {
                            result = await handleLoadUp(
                                deviceId,
                                'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined,
                                'duration' in eventData ? eventData.duration : undefined
                            );
                        }
                        else if (eventType === EventType.GRID_EMERGENCY) {
                            result = await handleGridEmergency(
                                deviceId,
                                'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined
                            );
                        }
                        else if (eventType === EventType.CRITICAL_PEAK) {
                            result = await handleCriticalPeak(
                                deviceId,
                                'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined
                            );
                        }
                        else if (eventType === EventType.START_SHED) {
                            result = await handleStartShed(
                                deviceId,
                                'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined,
                                'duration' in eventData ? eventData.duration || 0 : 0
                            );
                        }
                        else if (eventType === EventType.END_SHED) {
                            result = await handleEndShed(
                                deviceId,
                                'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined
                            );
                        }
                        else if (eventType === EventType.INFO_REQUEST) {
                            result = await handleInfoRequest(
                                deviceId,
                                'timestamp' in eventData && eventData.timestamp ? new Date(eventData.timestamp) : undefined
                            );
                        }
                        else if (eventType === EventType.ADVANCED_LOAD_UP) {
                            result = await handleAdvancedLoadUp(
                                deviceId,
                                'start_time' in eventData && eventData.start_time ? new Date(eventData.start_time) : undefined,
                                'duration' in eventData ? eventData.duration : 0,
                                'value' in eventData ? eventData.value : 0,
                                'units' in eventData ? eventData.units : 0,
                                'suggested_load_up_efficiency' in eventData ? eventData.suggested_load_up_efficiency : 0,
                                'event_id' in eventData ? eventData.event_id : uuidv4(),
                                'start_randomization' in eventData ? eventData.start_randomization : 0,
                                'end_randomization' in eventData ? eventData.end_randomization : 0
                            );
                        }

                        if (result) {
                            successfulEvents.push(result);
                        } else {
                            failedEvents.push({
                                device_id: deviceId,
                                error: "Failed to process event"
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing event for device ${deviceId}:`, error);
                        failedEvents.push({
                            device_id: deviceId,
                            error: error instanceof Error ? error.message : "Unknown error"
                        });
                    }
                }));

                // Return the results
                return c.json({
                    statusCode: 200,
                    body: {
                        successful_events: successfulEvents,
                        failed_events: failedEvents.length > 0 ? failedEvents : []
                    }
                }, 200);
            }
        } catch (error) {
            console.error("Error processing event:", error);
            return c.json({
                statusCode: 500,
                body: { reason: error instanceof Error ? error.message : "Unknown error" }
            }, 500);
        }
    })

export default app