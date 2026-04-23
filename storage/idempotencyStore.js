const processedEvents = new Set();

function isProcessed(processId, idempotencyKey) {
  return processedEvents.has(`${processId}:${idempotencyKey}`);
}

function markProcessed(processId, idempotencyKey) {
  processedEvents.add(`${processId}:${idempotencyKey}`);
}

function size() {
  return processedEvents.size;
}

function clearIdempotencyStore() {
  processedEvents.clear();
}

module.exports = { 
  isProcessed, 
  markProcessed, 
  size, 
  clearIdempotencyStore,
  processedEvents
};