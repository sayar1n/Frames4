// POST /api/event — приём события машины состояний.
// Валидирует тело, нормализует eventType , lock по processId.

const express = require('express');
const { processEvent } = require('../processing/eventProcessor');
const { runWithLock } = require('../storage/lockStore');
const { generateCorrelationId } = require('../utils/correlation');
const { resolveEventType, allowedEventTypesMessage } = require('../utils/eventType');
const router = express.Router();

router.post('/api/event', async (req, res) => {
  const { processId, eventType: rawEventType, idempotencyKey, correlationId: providedCorr, simulateFailure = false } = req.body;
  if (!processId || !rawEventType || !idempotencyKey) {
    return res.status(400).json({ error: 'Missing processId, eventType or idempotencyKey' });
  }
  const eventType = resolveEventType(rawEventType);
  if (!eventType) {
    return res.status(400).json({ error: `Invalid eventType. ${allowedEventTypesMessage()}` });
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
