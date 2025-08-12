import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import axios from 'axios';
import { DeviceData } from '../../../shared/schemas/device-data';

const SHIFTED_DATA_URL = "https://cloud.shiftedenergy.com/gridcube/telemetry";
const AUTH_URL = "https://cloud.shiftedenergy.com/v2/auth";
const SHIFTED_EMAIL = "evan@vawkes.com";
const SHIFTED_PASSWORD = "YxPxrr2mnL1DtJqa!=";
const TARGET_COMPANY_ID = "fb46c6f2-b88d-4754-91f4-1ca298a91468";
const ssmClient = new SSMClient({});
const dynamoClient = new DynamoDBClient({});

interface ShiftedPayload {
  device_id: string;
  timestamp: number;
  operational_state: number;
  instant_power: number;
  cumulative_energy: number;
  increment: number;
}

async function authShifted(): Promise<void> {
  try {
    const response = await axios.post(
      AUTH_URL,
      {
        email: SHIFTED_EMAIL,
        password: SHIFTED_PASSWORD
      }
    );

    if (response.status === 200) {
      const responseData = response.data;
      
      const command = new PutParameterCommand({
        Name: "SHIFTED_TOKEN",
        Value: responseData.id_token,
        Type: "SecureString",
        Overwrite: true
      });
      
      await ssmClient.send(command);
      console.log("Successfully updated SHIFTED_TOKEN in SSM");
    } else {
      console.error("Failed to authenticate with Shifted");
    }
  } catch (error) {
    console.error("Error during Shifted authentication:", error);
    throw error;
  }
}

async function getDeviceIdFromWireless(wirelessDeviceId: string): Promise<string | null> {
  try {
    // Use the GSI to efficiently query by wireless_device_id
    const command = new QueryCommand({
      TableName: "ProductionLine",
      IndexName: "wireless_device_id-index",
      KeyConditionExpression: "wireless_device_id = :wirelessDeviceId",
      ExpressionAttributeValues: {
        ":wirelessDeviceId": { S: wirelessDeviceId }
      }
    });

    const response = await dynamoClient.send(command);
    
    if (response.Items && response.Items.length > 0) {
      const item = response.Items[0] as any;
      return item.device_id?.S || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting device ID from wireless device ID:', error);
    return null;
  }
}

async function checkDeviceCompanyAccess(wirelessDeviceId: string): Promise<boolean> {
  try {
    // First, get the 6-digit device ID from the wireless device ID
    const deviceId = await getDeviceIdFromWireless(wirelessDeviceId);
    
    if (!deviceId) {
      console.log(`No device ID found for wireless device ID: ${wirelessDeviceId}`);
      return false;
    }

    console.log(`Resolved wireless device ID ${wirelessDeviceId} to device ID ${deviceId}`);

    // Check if the 6-digit device ID belongs to the target company
    const command = new GetItemCommand({
      TableName: "CompanyDevices",
      Key: {
        company_id: { S: TARGET_COMPANY_ID },
        device_id: { S: deviceId }
      }
    });

    const response = await dynamoClient.send(command);
    const hasAccess = !!response.Item;
    
    console.log(`Device ${deviceId} (wireless: ${wirelessDeviceId}) company access: ${hasAccess}`);
    return hasAccess;
  } catch (error) {
    console.error('Error checking device company access:', error);
    return false;
  }
}

async function getShiftedToken(): Promise<string> {
  try {
    const command = new GetParameterCommand({
      Name: "SHIFTED_TOKEN",
      WithDecryption: true
    });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || '';
  } catch (error) {
    console.error('Error getting Shifted token:', error);
    throw error;
  }
}

async function makeApiCall(payload: ShiftedPayload, numAttempts: number = 0): Promise<void> {
  if (numAttempts > 3) {
    console.error(`Failed to send payload ${JSON.stringify(payload)}, too many attempts.`);
    return;
  }

  console.log(`Sending payload: ${JSON.stringify(payload)}, attempt number ${numAttempts}`);
  
  let apiToken: string;
  try {
    apiToken = await getShiftedToken();
  } catch (error) {
    console.error('Failed to get token, authenticating...');
    await authShifted();
    await makeApiCall(payload, numAttempts + 1);
    return;
  }

  if (!apiToken) {
    console.error('No API token available, authenticating...');
    await authShifted();
    await makeApiCall(payload, numAttempts + 1);
    return;
  }

  try {
    const response = await axios.post(
      SHIFTED_DATA_URL,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.status === 200) {
      console.log("Sent Data to Shifted");
    } else if (response.status === 401) {
      console.log("Token Expired, updating...");
      await authShifted();
      await makeApiCall(payload, numAttempts + 1);
    } else {
      console.error("Bad Response from Shifted");
      console.error(response.status, response.statusText);
      console.error(response.data);
    }
  } catch (error) {
    console.error('Error making API call to Shifted:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log("Token Expired, updating...");
      await authShifted();
      await makeApiCall(payload, numAttempts + 1);
    } else {
      console.error("Bad Response from Shifted");
      console.error(error);
    }
  }
}

export async function sendToShiftedIfComplete(dynamoEntry: DeviceData): Promise<void> {
  console.log('Checking Dynamo entry for complete payload:', dynamoEntry);
  
  const {
    device_id,
    timestamp,
    operational_state,
    instant_power,
    cumulative_energy,
    message_number
  } = dynamoEntry;

  if (
    device_id &&
    timestamp &&
    operational_state !== undefined &&
    instant_power !== undefined &&
    cumulative_energy !== undefined &&
    message_number !== undefined
  ) {
    // Get the six-digit device ID from the wireless device ID
    const sixDigitDeviceId = await getDeviceIdFromWireless(device_id);
    
    if (!sixDigitDeviceId) {
      console.log(`No six-digit device ID found for wireless device ID: ${device_id}`);
      return;
    }

    // Check if device belongs to the target company
    const hasCompanyAccess = await checkDeviceCompanyAccess(device_id);
    
    if (!hasCompanyAccess) {
      console.log(`Device ${device_id} does not belong to company ${TARGET_COMPANY_ID}, not sending to Shifted`);
      return;
    }

    console.log(`Device ${device_id} (six-digit: ${sixDigitDeviceId}) belongs to company ${TARGET_COMPANY_ID}, sending to Shifted`);

    const payload: ShiftedPayload = {
      device_id: sixDigitDeviceId, // Use the six-digit device ID instead of the wireless device ID
      timestamp,
      operational_state,
      instant_power: Number(instant_power),
      cumulative_energy: Number(cumulative_energy),
      increment: message_number
    };

    await makeApiCall(payload);
    return;
  }

  console.log('Incomplete payload, not sending to Shifted');
} 