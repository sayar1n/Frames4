// GET /metrics — агрегированные счётчики переходов, ретраев, компенсаций,
// средние задержки по шагам, размеры in-memory хранилищ процессов и идемпотентности.
 
const express = require('express');
const { metrics } = require('../observability/metrics');
const { size } = require('../storage/idempotencyStore');
const { processStates } = require('../storage/processStore');
const router = express.Router();

router.get('/metrics', (req, res) => {
  const avgLatencies = {};
  for (const [step, data] of Object.entries(metrics.stepLatency)) {
    avgLatencies[step] = data.count > 0 ? (data.totalMs / data.count).toFixed(2) : 0;
  }
  res.json({
    counters: {
      successfulTransitions: metrics.successfulTransitions,
      errorTransitions: metrics.errorTransitions,
      retryDeliveries: metrics.retryDeliveries,
      compensationCounter: metrics.compensationCounter
    },
    averageStepLatencyMs: avgLatencies,
    totalProcesses: processStates.size,
    totalIdempotencyKeys: size()
  });
});

module.exports = router;