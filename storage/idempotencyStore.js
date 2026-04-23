//In-memory множество обработанных пар processId:idempotencyKey для защиты от дублей доставки.
 
const processedEvents = new Set();

// true, если событие с таким ключом для процесса уже успешно обработано. 
function isProcessed(processId, idempotencyKey) {
  return processedEvents.has(`${processId}:${idempotencyKey}`);
}

// Помечает ключ как обработанный после успешного перехода (включая ветку с компенсацией). 
function markProcessed(processId, idempotencyKey) {
  processedEvents.add(`${processId}:${idempotencyKey}`);
}

// Количество сохранённых ключей идемпотентности (для /metrics). 
function size() {
  return processedEvents.size;
}

// Полная очистка множества (тесты). 
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