# Signal Data Time Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist RSSI, SNR, link type, and Sidewalk RSSI as packet-level time-series data.

**Architecture:** Add a `DobbySignalData` DynamoDB table and a focused data-handler write helper. The top-level uplink handler decodes the payload type, combines Sidewalk metadata with connection-info signal fields when present, writes one signal row, then continues existing packet handling and last-known `DobbyInfo` updates.

**Tech Stack:** TypeScript, AWS CDK, AWS SDK v3 DocumentClient, Jest/ts-jest.

---

## File Structure

- Create `data-handler-ts/src/utils/signal-data.ts`: validates signal fields and writes `PutCommand` items to `DobbySignalData`.
- Create `data-handler-ts/src/utils/signal-data.test.ts`: unit coverage for writing and no-op behavior.
- Modify `data-handler-ts/src/packet-handlers/connection-info.ts`: export a parser so index can reuse packet fields for the combined signal row.
- Create `data-handler-ts/src/packet-handlers/connection-info.test.ts`: regression coverage for signal parsing and existing last-known writes.
- Modify `data-handler-ts/src/index.ts`: write one signal row per uplink when any signal field is present.
- Modify `data-handler-ts/src/utils/sidewalk-metadata.ts`: keep Sidewalk RSSI extraction and last-known write helper.
- Modify `data-handler-ts/src/utils/sidewalk-metadata.test.ts`: verify last-known behavior remains.
- Modify `shared/database/client.ts`: add `DEVICE_SIGNAL_DATA`.
- Modify `lib/dobby-api-v2-stack.ts`: create `DobbySignalData` and grant data handler permissions.

## Tasks

### Task 1: Signal Table Writer

**Files:**
- Create: `data-handler-ts/src/utils/signal-data.ts`
- Test: `data-handler-ts/src/utils/signal-data.test.ts`
- Modify: `shared/database/client.ts`

- [ ] **Step 1: Write failing tests**

Expected test cases:

```typescript
it('writes signal values to DobbySignalData with a millisecond timestamp', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1770000000123);
  await writeSignalDataToDynamo('wireless-device-1', {
    source_packet_type: 7,
    sidewalk_rssi: -22,
    rssi: -71,
    snr: 9,
    link_type: 2,
  });
  expect(docClient.send).toHaveBeenCalledWith(expect.objectContaining({
    input: expect.objectContaining({
      TableName: 'DobbySignalData',
      Item: {
        device_id: 'wireless-device-1',
        timestamp: 1770000000123,
        source_packet_type: 7,
        sidewalk_rssi: -22,
        rssi: -71,
        snr: 9,
        link_type: 2,
      },
    }),
  }));
});

it('does not write when no signal fields are present', async () => {
  await writeSignalDataToDynamo('wireless-device-1', { source_packet_type: 0 });
  expect(docClient.send).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd data-handler-ts && npx jest src/utils/signal-data.test.ts --runInBand`
Expected: FAIL because `signal-data.ts` does not exist.

- [ ] **Step 3: Implement minimal writer**

Add `DEVICE_SIGNAL_DATA: 'DobbySignalData'` to `TABLES`.

Create `writeSignalDataToDynamo(deviceId, fields, timestamp = Date.now())`, remove undefined values, skip writes unless at least one of `sidewalk_rssi`, `rssi`, `snr`, or `link_type` is present, and send a `PutCommand`.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd data-handler-ts && npx jest src/utils/signal-data.test.ts --runInBand`
Expected: PASS.

### Task 2: Connection Info Parser

**Files:**
- Modify: `data-handler-ts/src/packet-handlers/connection-info.ts`
- Test: `data-handler-ts/src/packet-handlers/connection-info.test.ts`

- [ ] **Step 1: Write failing tests**

Expected test cases:

```typescript
it('parses connection signal data from packet type 7', () => {
  const payload = Buffer.from([7, 0xb9, 0x09, 0x00, 0x00, 0x00, 0x02]);
  expect(parseConnectionInfoSignalData(payload)).toEqual({
    rssi: -71,
    snr: 9,
    link_type: 2,
  });
});

it('keeps writing last-known connection info to DobbyInfo', async () => {
  await handleConnectionInfo(Buffer.from([7, 0xb9, 0x09, 0x00, 0x00, 0x00, 0x02]), 'device-1');
  expect(writeDeviceInfoToDynamo).toHaveBeenCalledWith('device-1', 'rssi', -71);
  expect(writeDeviceInfoToDynamo).toHaveBeenCalledWith('device-1', 'snr', 9);
  expect(writeDeviceInfoToDynamo).toHaveBeenCalledWith('device-1', 'link_type', 2);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd data-handler-ts && npx jest src/packet-handlers/connection-info.test.ts --runInBand`
Expected: FAIL because `parseConnectionInfoSignalData` is not exported.

- [ ] **Step 3: Implement parser and reuse it in handler**

Export `parseConnectionInfoSignalData(payload)` returning `undefined` for invalid response type and `{ rssi, snr, link_type }` for valid packets. Use it inside `handleConnectionInfo`.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd data-handler-ts && npx jest src/packet-handlers/connection-info.test.ts --runInBand`
Expected: PASS.

### Task 3: Uplink Signal Row Integration

**Files:**
- Modify: `data-handler-ts/src/index.ts`
- Modify: `data-handler-ts/src/utils/sidewalk-metadata.test.ts`
- Test: `data-handler-ts/src/index.test.ts`

- [ ] **Step 1: Write failing tests**

Expected test cases:

```typescript
it('writes one combined signal row for connection info with Sidewalk RSSI', async () => {
  await handler({
    WirelessDeviceId: 'wireless-device-1',
    PayloadData: Buffer.from('07b90900000002', 'hex').toString('base64'),
    WirelessMetadata: { Sidewalk: { Rssi: -22 } },
  });
  expect(writeSignalDataToDynamo).toHaveBeenCalledWith('wireless-device-1', {
    source_packet_type: 7,
    sidewalk_rssi: -22,
    rssi: -71,
    snr: 9,
    link_type: 2,
  });
});

it('writes a Sidewalk-only signal row for non-connection packets with Sidewalk RSSI', async () => {
  await handler({
    WirelessDeviceId: 'wireless-device-1',
    PayloadData: Buffer.from('08', 'hex').toString('base64'),
    WirelessMetadata: { Sidewalk: { Rssi: -30 } },
  });
  expect(writeSignalDataToDynamo).toHaveBeenCalledWith('wireless-device-1', {
    source_packet_type: 8,
    sidewalk_rssi: -30,
  });
});

it('does not write a signal row when no signal fields are present', async () => {
  await handler({
    WirelessDeviceId: 'wireless-device-1',
    PayloadData: Buffer.from('08', 'hex').toString('base64'),
    WirelessMetadata: { Sidewalk: {} },
  });
  expect(writeSignalDataToDynamo).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd data-handler-ts && npx jest src/index.test.ts --runInBand`
Expected: FAIL because index does not call `writeSignalDataToDynamo`.

- [ ] **Step 3: Implement integration**

In `index.ts`, decode payload before metadata writes, get `source_packet_type`, extract Sidewalk RSSI, merge connection info parser output when packet type is 7, call `writeSignalDataToDynamo`, then run existing packet switch. Keep existing `writeSidewalkMetadataToDynamo` behavior or equivalent last-known Sidewalk RSSI update.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd data-handler-ts && npx jest src/index.test.ts src/utils/sidewalk-metadata.test.ts --runInBand`
Expected: PASS.

### Task 4: CDK Wiring

**Files:**
- Modify: `lib/dobby-api-v2-stack.ts`

- [ ] **Step 1: Add focused infrastructure test via synth**

Run after implementation: `bun run cdk synth --all --context environment=develop`
Expected: synthesized template contains `DobbySignalData` with `device_id` partition key and `timestamp` sort key.

- [ ] **Step 2: Implement CDK table and permissions**

Create a retained, pay-per-request `DobbySignalData` table in `DobbyApiV2Stack`; grant data handler read/write data; include it in explicit DynamoDB policy resources.

- [ ] **Step 3: Run synth**

Run: `bun run cdk synth --all --context environment=develop`
Expected: exit 0.

### Task 5: Final Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run data-handler tests**

Run: `cd data-handler-ts && npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 2: Run data-handler build**

Run: `cd data-handler-ts && npm run build`
Expected: PASS.

- [ ] **Step 3: Run root build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add shared/database/client.ts data-handler-ts/src lib/dobby-api-v2-stack.ts docs/dev-workflow/plans/2026-05-18-signal-data-timeseries-implementation.md
git commit -m "feat: store signal data time series"
```
