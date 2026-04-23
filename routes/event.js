const express = require('express');
const { processEvent } = require('../processing/eventProcessor');
const { runWithLock } = require('../storage/lockStore');
const { generateCorrelationId } = require('../utils/correlation');
const router = express.Router();

router.post('/api/event', async (req, res) => {
  const { processId, eventType, idempotencyKey, correlationId: providedCorr, simulateFailure = false } = req.body;
  if (!processId || !eventType || !idempotencyKey) {
    return res.status(400).json({ error: 'Missing processId, eventType or idempotencyKey' });
  }
  const allowed = ['ПринятьЗаявку', 'Забронировать', 'ВыдатьДоступ', 'Завершить'];
  if (!allowed.includes(eventType)) {
    return res.status(400).json({ error: `Invalid eventType. Allowed: ${allowed.join(', ')}` });
  }
  const correlationId = providedCorr || generateCorrelationId();

  try {
    const result = await runWithLock(processId, () =>
      processEvent(processId, eventType, idempotencyKey, correlationId, simulateFailure)
    );
    res.status(result.error ? 400 : 200).json({ ...result, correlationId });
  } catch (err) {
    res.status(500).json({ error: 'Internal error', correlationId });
  }
});

module.exports = router;