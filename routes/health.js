const express = require('express');
const { metrics } = require('../observability/metrics');
const config = require('../config');
const router = express.Router();

router.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

router.get('/health/ready', (req, res) => {
  const degraded = metrics.compensationCounter > config.COMPENSATION_THRESHOLD;
  if (degraded) {
    res.status(503).json({ status: 'not ready', reason: 'critical_degradation', compensations: metrics.compensationCounter });
  } else {
    res.json({ status: 'ready', compensations: metrics.compensationCounter });
  }
});

module.exports = router;