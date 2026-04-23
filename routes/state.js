// GET /api/state/:processId — текущее состояние процесса (или «Новый», если записи нет).
// correlationId можно передать в query или получить сгенерированный в ответе.
 
const express = require('express');
const { getState } = require('../storage/processStore');
const { STATES } = require('../domain/stateMachine');
const { generateCorrelationId } = require('../utils/correlation');
const router = express.Router();

router.get('/api/state/:processId', (req, res) => {
  const state = getState(req.params.processId) || STATES.NEW;
  const correlationId = req.query.correlationId || generateCorrelationId();
  res.json({ processId: req.params.processId, state, correlationId });
});

module.exports = router;