// POST /admin/reset — сброс in-memory метрик (для тестов).
// Состояния процессов и ключи идемпотентности этим эндпоинтом не очищаются.
 
const express = require('express');
const { resetMetrics } = require('../observability/metrics');
const router = express.Router();

router.post('/admin/reset', (req, res) => {
  resetMetrics();
  res.json({ message: 'Metrics reset' });
});

module.exports = router;