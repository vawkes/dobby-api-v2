import { DynamoDB } from "@aws-sdk/client-dynamodb";
import app from "../lambda/events/events";
import { createRequest } from "./testUtils";
import { EventType } from "../lambda/events/eventsSchema";

// Mock the DynamoDB client
jest.mock("@aws-sdk/client-dynamodb", () => {
    const mockDynamoInstance = {
        scan: jest.fn(),
        query: jest.fn(),
        putItem: jest.fn(),
        getItem: jest.fn(),
    };

    return {
        DynamoDB: jest.fn(() => mockDynamoInstance),
    };
});

// Mock the event handler functions
jest.mock("../lambda/events/eventHandlers/loadUp", () => ({
    handleLoadUp: jest.fn().mockResolvedValue({
        event_id: "12345678-1234-1234-1234-123456789012",
        event_type: "LOAD_UP",
        event_data: {
            device_id: "98765432-4321-4321-4321-987654321098",
            start_time: "2023-01-01T12:00:00Z",
            event_sent: true
        }
    }),
}));

describe("Events API", () => {
    let mockDynamoInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Get the mocked instance that's returned by the DynamoDB constructor
        mockDynamoInstance = (new DynamoDB({}) as any);
    });

    describe("GET /events", () => {
        it("should return all events", async () => {
            // Mock DynamoDB scan response with proper typing
            mockDynamoInstance.scan.mockResolvedValueOnce({
                Items: [
                    {
                        event_id: { S: "12345678-1234-1234-1234-123456789012" },
                        event_type: { S: "LOAD_UP" },
                        event_data: {
                            M: {
                                device_id: { S: "98765432-4321-4321-4321-987654321098" },
                                start_time: { S: "2023-01-01T12:00:00Z" },
                                event_sent: { BOOL: true }
                            }
                        }
                    },
                    {
                        event_id: { S: "87654321-4321-4321-4321-987654321098" },
                        event_type: { S: "END_SHED" },
                        event_data: {
                            M: {
                                device_id: { S: "98765432-4321-4321-4321-987654321098" },
                                start_time: { S: "2023-01-02T12:00:00Z" },
                                event_sent: { BOOL: true }
                            }
                        }
                    },
                ],
            });

            const req = createRequest("/");
            const res = await app.fetch(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveLength(2);
            expect(data[0].event_id).toBe("12345678-1234-1234-1234-123456789012");
            expect(data[1].event_id).toBe("87654321-4321-4321-4321-987654321098");
        });
    });

    describe("GET /events/:deviceId", () => {
        it("should return events for a specific device", async () => {
            // Mock DynamoDB getItem response with proper typing
            mockDynamoInstance.getItem.mockResolvedValueOnce({
                Item: {
                    event_id: { S: "12345678-1234-1234-1234-123456789012" },
                    event_type: { S: "LOAD_UP" },
                    event_data: {
                        M: {
                            device_id: { S: "98765432-4321-4321-4321-987654321098" },
                            start_time: { S: "2023-01-01T12:00:00Z" },
                            event_sent: { BOOL: true }
                        }
                    }
                },
            });

            const req = createRequest("/98765432-4321-4321-4321-987654321098");
            const res = await app.fetch(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.event_data.device_id).toBe("98765432-4321-4321-4321-987654321098");
        });
    });

    describe("POST /events", () => {
        it("should create a new event", async () => {
            // Valid event data according to the schema
            const eventData = {
                event_id: "12345678-1234-1234-1234-123456789012",
                event_type: EventType.LOAD_UP,
                event_data: {
                    device_id: "98765432-4321-4321-4321-987654321098",
                    start_time: "2023-01-01T12:00:00Z",
                    duration: 3600,
                    event_sent: true
                }
            };

            const req = createRequest("/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(eventData),
            });

            const res = await app.fetch(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.statusCode).toBe(200);
            expect(data.body.event_data.device_id).toBe("98765432-4321-4321-4321-987654321098");
        });

        it("should return 400 for invalid event data", async () => {
            const invalidEventData = {
                // Missing required fields
                event_type: "INVALID_TYPE",
            };

            const req = createRequest("/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(invalidEventData),
            });

            const res = await app.fetch(req);
            expect(res.status).toBe(400);
        });
    });
}); 