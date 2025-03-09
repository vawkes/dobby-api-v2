import { IoTWirelessClient, SendDataToWirelessDeviceCommand } from "@aws-sdk/client-iot-wireless";

const iotClient = new IoTWirelessClient({});

async function sendDataToWirelessDevice(deviceId: string, payloadBase64: string): Promise<boolean> {

    const command = new SendDataToWirelessDeviceCommand({
        Id: deviceId,
        TransmitMode: 1, // ACK mode
        PayloadData: payloadBase64,
        WirelessMetadata: {
            Sidewalk: {
                'MessageType': 'CUSTOM_COMMAND_ID_NOTIFY',
                'AckModeRetryDurationSecs': 10
            }
        }
    });

    try {
        const response = await iotClient.send(command);
        console.log("Data sent successfully:", response);
        return true;
    } catch (error) {
        console.error("Error sending data to Dobby:", error);
        return false;
    }
}

export async function sendToDobby(deviceId: string, payload: ArrayBuffer): Promise<boolean> {
    const buffer = Buffer.from(payload);
    console.log("Payload ", buffer);
    console.log("Payload Len ", buffer.length);

    const payloadBase64 = buffer.toString('base64');
    console.log("Base64 Payload ", payloadBase64);
    console.log("Base64 Payload Len ", payloadBase64.length);

    return await sendDataToWirelessDevice(deviceId, payloadBase64);
}
