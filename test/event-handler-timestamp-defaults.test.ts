import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('../lambda/utils/sendToDobby.ts', () => ({
  sendToDobby: jest.fn()
}))

jest.mock('../lambda/utils/saveEvent.ts', () => ({
  saveEventToDynamoDB: jest.fn()
}))

import { sendToDobby } from '../lambda/utils/sendToDobby.ts'
import { saveEventToDynamoDB } from '../lambda/utils/saveEvent.ts'
import { handleInfoRequest } from '../lambda/events/eventHandlers/infoRequest.ts'
import { handleEndShed } from '../lambda/events/eventHandlers/endShed.ts'

const mockSendToDobby = sendToDobby as jest.MockedFunction<typeof sendToDobby>
const mockSaveEventToDynamoDB = saveEventToDynamoDB as jest.MockedFunction<typeof saveEventToDynamoDB>

describe('Event handler timestamp defaults', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSendToDobby.mockResolvedValue(true)
    mockSaveEventToDynamoDB.mockResolvedValue(true)
  })

  it('uses current time when info request timestamp is omitted', async () => {
    const result = await handleInfoRequest('000012')

    expect(result.event_data.start_time).toEqual(expect.any(Number))
    expect(result.event_data.start_time).toBeGreaterThan(0)
  })

  it('uses current time when end shed start time is omitted', async () => {
    const result = await handleEndShed('000013')

    expect(result.event_data.start_time).toEqual(expect.any(Number))
    expect(result.event_data.start_time).toBeGreaterThan(0)
  })
})
