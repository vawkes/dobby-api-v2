import { DynamoDB } from "@aws-sdk/client-dynamodb";
import app from "../lambda/devices/devices";
import { createDynamoDBResponse, createDynamoDBGetItemResponse, createRequest } from "./testUtils";

// Mock the DynamoDB client
jest.mock("@aws-sdk/client-dynamodb", () => {
    const mockDynamoInstance = {
        scan: jest.fn(),
        getItem: jest.fn(),
    };

    return {
        DynamoDB: jest.fn(() => mockDynamoInstance),
    };
});

describe("Devices API", () => {
    let mockDynamoInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Get the mocked instance that's returned by the DynamoDB constructor
        mockDynamoInstance = (new DynamoDB({}) as any);
    });

    describe("GET /devices", () => {
        it("should return all devices", async () => {
            // Mock devices data with all required fields
            const mockResponse = {
                Items: [
                    {
                        device_id: { S: "12345678-1234-1234-1234-123456789012" },
                        name: { S: "Device 1" },
                        type: { S: "SWITCH" },
                        cta_version: { S: "1.0" },
                        firmware_date: { S: "2023-01-01" },
                        model_number: { S: "MODEL123" },
                        device_type: { S: "THERMOSTAT" },
                        capability_bitmap: { S: "0x1234" },
                        device_revision: { S: "1.0" },
                        firmware_version: { S: "2.0" },
                        serial_number: { S: "SN12345" },
                        vendor_id: { S: "VID123" },
                        last_rx_rssi: { N: "-75" },
                        last_link_type: { N: "1" },
                        updated_at: { S: "2023-06-01T12:00:00Z" }
                    },
                    {
                        device_id: { S: "87654321-4321-4321-4321-987654321098" },
                        name: { S: "Device 2" },
                        type: { S: "SWITCH" },
                        cta_version: { S: "1.0" },
                        firmware_date: { S: "2023-02-01" },
                        model_number: { S: "MODEL456" },
                        device_type: { S: "THERMOSTAT" },
                        capability_bitmap: { S: "0x5678" },
                        device_revision: { S: "1.1" },
                        firmware_version: { S: "2.1" },
                        serial_number: { S: "SN67890" },
                        vendor_id: { S: "VID456" },
                        last_rx_rssi: { N: "-82" },
                        last_link_type: { N: "4" },
                        updated_at: { S: "2023-06-02T14:30:00Z" }
                    },
                ],
            };

            // Mock the scan response
            mockDynamoInstance.scan.mockResolvedValueOnce(mockResponse);

            const req = createRequest("/");
            const res = await app.fetch(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveLength(2);
            expect(data[0].device_id).toBe("12345678-1234-1234-1234-123456789012");
            expect(data[1].device_id).toBe("87654321-4321-4321-4321-987654321098");
        });

        it("should return empty array when no devices exist", async () => {
            // Mock empty response with proper typing
            mockDynamoInstance.scan.mockResolvedValueOnce({
                Items: [],
            });

            const req = createRequest("/");
            const res = await app.fetch(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toEqual([]);
        });
    });

    describe("GET /devices/:deviceId", () => {
        it("should return a specific device when found", async () => {
            // Mock getItem response with all required fields
            mockDynamoInstance.getItem.mockResolvedValueOnce({
                Item: {
                    device_id: { S: "12345678-1234-1234-1234-123456789012" },
                    cta_version: { S: "1.0" },
                    firmware_date: { S: "2023-01-01" },
                    model_number: { S: "MODEL123" },
                    device_type: { S: "THERMOSTAT" },
                    capability_bitmap: { S: "0x1234" },
                    device_revision: { S: "1.0" },
                    firmware_version: { S: "2.0" },
                    serial_number: { S: "SN12345" },
                    vendor_id: { S: "VID123" }
                },
            });

            const req = createRequest("/12345678-1234-1234-1234-123456789012");
            const res = await app.fetch(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.device_id).toBe("12345678-1234-1234-1234-123456789012");
            expect(data.cta_version).toBe("1.0");
            expect(data.firmware_version).toBe("2.0");
        });

        it("should return 404 when device is not found", async () => {
            // Mock empty response
            mockDynamoInstance.getItem.mockResolvedValueOnce({
                Item: undefined,
            });

            const req = createRequest("/nonexistent");
            const res = await app.fetch(req);
            expect(res.status).toBe(404);

            const data = await res.json();
            expect(data.error).toBe("Device not found");
        });

        it("should return 500 when there's a DynamoDB error", async () => {
            // Mock DynamoDB error
            mockDynamoInstance.getItem.mockRejectedValueOnce(new Error("DynamoDB error"));

            const req = createRequest("/device1");
            const res = await app.fetch(req);
            expect(res.status).toBe(500);

            const data = await res.json();
            expect(data.error).toBe("Internal server error");
        });
    });
}); 