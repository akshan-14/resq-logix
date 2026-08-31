const fs = require('fs');

class BleServiceMock {
  constructor(useBuggyLogic) {
    this.knownMessageIds = new Set();
    this.status = { duplicatesIgnored: 0, messagesForwarded: 0 };
    this.useBuggyLogic = useBuggyLogic;
  }

  processMessage(msg) {
    const dedupKey = this.useBuggyLogic ? msg.message_id : msg.report_id;
    if (this.knownMessageIds.has(dedupKey)) {
      this.status.duplicatesIgnored++;
      return false; // Did not process
    }
    this.knownMessageIds.add(dedupKey);
    this.status.messagesForwarded++;
    return true; // Processed
  }
}

console.log('--- RUNNING BLE DEDUP REGRESSION TEST ---');

const msgHop1 = {
  protocol_version: 1,
  message_id: 'msg-REP-999-1',
  report_id: 'REP-999',
  hop_count: 1,
  payload: { type: 'ROAD_BLOCKED' }
};

const msgHop2 = {
  protocol_version: 1,
  message_id: 'msg-REP-999-2',
  report_id: 'REP-999',
  hop_count: 2,
  payload: { type: 'ROAD_BLOCKED' }
};

const buggyService = new BleServiceMock(true);
const buggyRes1 = buggyService.processMessage(msgHop1);
const buggyRes2 = buggyService.processMessage(msgHop2);

console.log('\n[BUGGY LOGIC (keying on message_id)]');
console.log('Processed Hop 1?', buggyRes1);
console.log('Processed Hop 2?', buggyRes2);
console.log('Duplicates Ignored:', buggyService.status.duplicatesIgnored);
if (buggyRes2 === true) {
    console.log('❌ FAILED: Buggy logic processed the same report twice because message_id was different!');
}

const fixedService = new BleServiceMock(false);
const fixedRes1 = fixedService.processMessage(msgHop1);
const fixedRes2 = fixedService.processMessage(msgHop2);

console.log('\n[FIXED LOGIC (keying on report_id)]');
console.log('Processed Hop 1?', fixedRes1);
console.log('Processed Hop 2?', fixedRes2);
console.log('Duplicates Ignored:', fixedService.status.duplicatesIgnored);
if (fixedRes2 === false) {
    console.log('✅ PASSED: Fixed logic rejected the duplicate report because report_id matched!');
}
