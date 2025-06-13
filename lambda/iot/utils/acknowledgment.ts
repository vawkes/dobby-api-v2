import { IoTWirelessClient, SendDataToWirelessDeviceCommand } from "@aws-sdk/client-iot-wireless";

/**
 * Sends acknowledgment to a device
 */
export async function sendAck(deviceId: string, messageType: number, msgNumber: number): Promise<void> {
    try {
        console.log(`Sending ACK to device ${deviceId} for message type ${messageType}, number ${msgNumber}`);

        const iotwireless = new IoTWirelessClient({ region: "us-east-1" });

        // Create a buffer with 3 bytes (matching Python's struct.pack(">BBB", 13, message_type, message_number))
        const payload = Buffer.alloc(3);
        payload.writeUInt8(13, 0);          // First byte: 13 (ACK type)
        payload.writeUInt8(messageType, 1); // Second byte: message_type
        payload.writeUInt8(msgNumber, 2);   // Third byte: message_number

        console.log('ACK payload (hex):', payload.toString('hex'));

        const command = new SendDataToWirelessDeviceCommand({
            Id: deviceId,
            TransmitMode: 1, // Number between 0 and 1
            PayloadData: payload.toString('base64')
        });

        await iotwireless.send(command);
        console.log('ACK sent successfully');
    } catch (error) {
        console.error('Error sending ACK:', error);
    }
} 