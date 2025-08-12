import { DynamoDB } from "@aws-sdk/client-dynamodb"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { sendInfoRequestToDevice } from "../utils/sendInfoRequest"

interface WatchdogResult {
    statusCode: number
    body: {
        totalDevices: number
        successCount: number
        failureCount: number
        durationMs: number
        batchesProcessed: number
    }
}

/**
 * Watchdog timer Lambda function
 * Scans all devices in ProductionLine table and sends info requests to feed watchdog timers
 * Runs every ~6 hours to prevent device watchdog timeouts
 */
export async function handler(event: any): Promise<WatchdogResult> {
    console.log('Starting watchdog timer feed for all devices')
    
    const dynamodb = new DynamoDB({ region: "us-east-1" })
    const startTime = Date.now()
    
    try {
        // Scan ProductionLine table to get all wireless device IDs
        const allDevices = await getAllWirelessDeviceIds(dynamodb)
        console.log(`Found ${allDevices.length} devices to ping`)
        
        if (allDevices.length === 0) {
            console.log('No devices found - nothing to process')
            return {
                statusCode: 200,
                body: {
                    totalDevices: 0,
                    successCount: 0,
                    failureCount: 0,
                    durationMs: Date.now() - startTime,
                    batchesProcessed: 0
                }
            }
        }
        
        // Send info requests in batches to avoid overwhelming the system
        const batchSize = 10 // Process 10 devices concurrently per batch
        let successCount = 0
        let failureCount = 0
        let batchesProcessed = 0
        
        for (let i = 0; i < allDevices.length; i += batchSize) {
            const batch = allDevices.slice(i, i + batchSize)
            batchesProcessed++
            
            console.log(`Processing batch ${batchesProcessed} (devices ${i + 1}-${Math.min(i + batchSize, allDevices.length)})`)
            
            // Process batch concurrently
            const results = await Promise.allSettled(
                batch.map(deviceId => sendInfoRequestToDevice(deviceId))
            )
            
            // Count successes and failures
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    successCount++
                } else {
                    failureCount++
                    const deviceId = batch[index]
                    const error = result.status === 'rejected' ? result.reason : 'Send failed'
                    console.warn(`Failed to send watchdog to device ${deviceId}:`, error)
                }
            })
            
            // Small delay between batches to be respectful to downstream services
            if (i + batchSize < allDevices.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
        
        const duration = Date.now() - startTime
        console.log(`Watchdog timer feed completed: ${successCount} success, ${failureCount} failures in ${duration}ms across ${batchesProcessed} batches`)
        
        return {
            statusCode: 200,
            body: {
                totalDevices: allDevices.length,
                successCount,
                failureCount,
                durationMs: duration,
                batchesProcessed
            }
        }
        
    } catch (error) {
        console.error('Watchdog timer feed failed:', error)
        throw error
    }
}

/**
 * Scans the ProductionLine table to get all wireless device IDs
 * Uses pagination to handle large tables efficiently
 */
async function getAllWirelessDeviceIds(dynamodb: DynamoDB): Promise<string[]> {
    const devices: string[] = []
    let lastEvaluatedKey: any = undefined
    let scannedCount = 0
    
    console.log('Starting ProductionLine table scan for wireless device IDs')
    
    do {
        const params: any = {
            TableName: "ProductionLine",
            ProjectionExpression: "wireless_device_id",
            FilterExpression: "attribute_exists(wireless_device_id)", // Only get items with wireless_device_id
        }
        
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey
        }
        
        const result = await dynamodb.scan(params)
        scannedCount += result.ScannedCount || 0
        
        if (result.Items) {
            const batchDevices = result.Items
                .map(item => unmarshall(item))
                .map(item => item.wireless_device_id)
                .filter(id => id && typeof id === 'string') // Filter out any null/undefined/invalid values
                
            devices.push(...batchDevices)
            console.log(`Scan iteration: found ${batchDevices.length} valid devices (total so far: ${devices.length})`)
        }
        
        lastEvaluatedKey = result.LastEvaluatedKey
        
    } while (lastEvaluatedKey)
    
    console.log(`ProductionLine scan complete: scanned ${scannedCount} items, found ${devices.length} valid wireless device IDs`)
    return devices
}
