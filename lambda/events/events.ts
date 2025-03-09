import { Hono } from "hono";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { eventsSchema, eventSchema, eventRequestSchema, EventType } from './eventsSchema';
import { describeRoute } from 'hono-openapi';
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { handleLoadUp } from "./eventHandlers/loadUp";

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
            const events = results.Items?.map(item => unmarshall(item)) || [];
            return c.json(eventsSchema.parse(events));
        } catch (error) {
            console.error("Error fetching events:", error);
            return c.json({ error: "Failed to fetch events" }, 500);
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
        const body = await c.req.json()
        const parsedBody = eventRequestSchema.parse(body)

        switch (parsedBody.event_type) {
            case EventType.LOAD_UP:
                const handleLoadUp(parsedBody.device_id, parsedBody.startTime, parsedBody.duration)
                break;
            case EventType.GRID_EMERGENCY:
                break;
            case EventType.CRITICAL_PEAK:
                break;
            case EventType.START_SHED:
                break;
            case EventType.END_SHED:
                break;
        }

        return c.json({ "response": "Hello from Events" })
    })

export default app