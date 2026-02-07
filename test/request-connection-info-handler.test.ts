import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('../lambda/utils/sendToDobby.ts', () => ({
  sendToDobby: jest.fn()
}))

jest.mock('../lambda/utils/saveEvent.ts', () => ({
  saveEventToDynamoDB: jest.fn()
}))

import { sendToDobby } from '../lambda/utils/sendToDobby.ts'
import { saveEventToDynamoDB } from '../lambda/utils/saveEvent.ts'
import { handleRequestConnectionInfo } from '../lambda/events/eventHandlers/requestConnectionInfo.ts'

const mockSendToDobby = sendToDobby as jest.MockedFunction<typeof sendToDobby>
const mockSaveEventToDynamoDB = saveEventToDynamoDB as jest.MockedFunction<typeof saveEventToDynamoDB>

describe('handleRequestConnectionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSaveEventToDynamoDB.mockResolvedValue(true)
  })

  it('stores event_sent as true when send succeeds', async () => {
    mockSendToDobby.mockResolvedValue(true)

    const result = await handleRequestConnectionInfo({ device_id: '000012' })

    expect(result.event_data.event_sent).toBe(true)
    expect(mockSaveEventToDynamoDB).toHaveBeenCalledWith(
      expect.objectContaining({
        event_data: expect.objectContaining({
          device_id: '000012',
          event_sent: true
        })
      })
    )
  })

  it('stores event_sent as false when send fails', async () => {
    mockSendToDobby.mockResolvedValue(false)

    const result = await handleRequestConnectionInfo({ device_id: '000013' })

    expect(result.event_data.event_sent).toBe(false)
    expect(mockSaveEventToDynamoDB).toHaveBeenCalledWith(
      expect.objectContaining({
        event_data: expect.objectContaining({
          device_id: '000013',
          event_sent: false
        })
      })
    )
  })
})

