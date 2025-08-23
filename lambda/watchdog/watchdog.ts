import { ScanCommand } from "@aws-sdk/lib-dynamodb"
import { docClient, TABLES } from "../../shared/database/client"
import { WirelessDeviceId, wirelessDeviceIdSchema } from "../../shared/schemas/primitives"
import { sendConnectionInfoRequestToDevice } from "../utils/sendConnectionInfoRequest"

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
 * Scans all devices in ProductionLine table and sends connection info requests to feed watchdog timers
 * Runs every ~6 hours to prevent device watchdog timeouts
 */
export async function handler(event: any): Promise<WatchdogResult> {
    console.log('Starting watchdog timer feed with connection info requests for all devices')
    
    const startTime = Date.now()
    
    try {
        // Scan ProductionLine table to get all wireless device IDs
        const allDevices = await getAllWirelessDeviceIds()
        console.log(`Found ${allDevices.length} devices to send connection info requests`)
        
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
        
        // Send connection info requests in batches to avoid overwhelming the system
        const batchSize = 10 // Process 10 devices concurrently per batch
        let successCount = 0
        let failureCount = 0
        let batchesProcessed = 0
        
        for (let i = 0; i < allDevices.length; i += batchSize) {
            const batch = allDevices.slice(i, i + batchSize)
            batchesProcessed++
            
            console.log(`Processing batch ${batchesProcessed} with connection info requests (devices ${i + 1}-${Math.min(i + batchSize, allDevices.length)})`)
            
            // Process batch concurrently
            const results = await Promise.allSettled(
                batch.map(deviceId => sendConnectionInfoRequestToDevice(deviceId))
            )
            
            // Count successes and failures
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    successCount++
                } else {
                    failureCount++
                    const deviceId = batch[index]
                    const error = result.status === 'rejected' ? result.reason : 'Send failed'
                    console.warn(`Failed to send connection info request to device ${deviceId}:`, error)
                }
            })
            
            // Small delay between batches to be respectful to downstream services
            if (i + batchSize < allDevices.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
        
        const duration = Date.now() - startTime
        console.log(`Watchdog timer feed with connection info requests completed: ${successCount} success, ${failureCount} failures in ${duration}ms across ${batchesProcessed} batches`)
        
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
 * Now uses unified database client and proper type validation
 */
async function getAllWirelessDeviceIds(): Promise<WirelessDeviceId[]> {
    const devices: WirelessDeviceId[] = []
    let lastEvaluatedKey: any = undefined
    let scannedCount = 0
    
    console.log('Starting ProductionLine table scan for wireless device IDs')
    
    do {
        const command = new ScanCommand({
            TableName: TABLES.PRODUCTION_LINE,
            ProjectionExpression: "wireless_device_id",
            FilterExpression: "attribute_exists(wireless_device_id)", // Only get items with wireless_device_id
            ExclusiveStartKey: lastEvaluatedKey
        })
        
        const result = await docClient.send(command)
        scannedCount += result.ScannedCount || 0
        
        if (result.Items) {
            const batchDevices = result.Items
                .map(item => item.wireless_device_id)
                .filter(id => {
                    // Validate each ID using the schema
                    const validationResult = wirelessDeviceIdSchema.safeParse(id)
                    if (!validationResult.success) {
                        console.warn(`Invalid wireless device ID found: ${id}`)
                        return false
                    }
                    return true
                })
                .map(id => id as WirelessDeviceId) // Type assertion after validation
                
            devices.push(...batchDevices)
            console.log(`Scan iteration: found ${batchDevices.length} valid devices (total so far: ${devices.length})`)
        }
        
        lastEvaluatedKey = result.LastEvaluatedKey
        
    } while (lastEvaluatedKey)
    
    console.log(`ProductionLine scan complete: scanned ${scannedCount} items, found ${devices.length} valid wireless device IDs`)
    return devices
}
