// Глобальные счётчики и накопление задержек по шагам (in-memory). resetMetrics сбрасывает всё в ноль — вызывается из /admin/reset и тестов.
const { EVENTS } = require('../domain/stateMachine');

function emptyStepLatency() {
  return Object.fromEntries(
    Object.values(EVENTS).map((name) => [name, { totalMs: 0, count: 0 }])
  );
}

const metrics = {
  successfulTransitions: 0,
  errorTransitions: 0,
  retryDeliveries: 0,
  compensationCounter: 0,
  stepLatency: emptyStepLatency()
};

// Добавляет latencyMs к агрегату для известного stepName (тип события).
function recordLatency(stepName, latencyMs) {
  const rec = metrics.stepLatency[stepName];
  if (rec) {
    rec.totalMs += latencyMs;
    rec.count++;
  }
}

// Обнуляет все счётчики и гистограммы задержек.
function resetMetrics() {
  metrics.successfulTransitions = 0;
  metrics.errorTransitions = 0;
  metrics.retryDeliveries = 0;
  metrics.compensationCounter = 0;
  metrics.stepLatency = emptyStepLatency();
}

module.exports = { metrics, recordLatency, resetMetrics };
