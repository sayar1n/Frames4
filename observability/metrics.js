const metrics = {
  successfulTransitions: 0,
  errorTransitions: 0,
  retryDeliveries: 0,
  compensationCounter: 0,
  stepLatency: {
    'ПринятьЗаявку': { totalMs: 0, count: 0 },
    'Забронировать': { totalMs: 0, count: 0 },
    'ВыдатьДоступ': { totalMs: 0, count: 0 },
    'Завершить': { totalMs: 0, count: 0 }
  }
};

function recordLatency(stepName, latencyMs) {
  const rec = metrics.stepLatency[stepName];
  if (rec) {
    rec.totalMs += latencyMs;
    rec.count++;
  }
}

function resetMetrics() {
  metrics.successfulTransitions = 0;
  metrics.errorTransitions = 0;
  metrics.retryDeliveries = 0;
  metrics.compensationCounter = 0;
  for (const step in metrics.stepLatency) {
    metrics.stepLatency[step] = { totalMs: 0, count: 0 };
  }
}

module.exports = { metrics, recordLatency, resetMetrics };