// Сценарий отката после сбоя: логирует «отмену брони», увеличивает счётчик компенсаций
// в метриках (влияет на /health/ready).
 
const { metrics } = require('../observability/metrics');
const { log } = require('../observability/logger');

// Выполняет компенсацию для processId; пишет логи с correlationId и обновляет metrics.compensationCounter. 
async function executeCompensation(processId, correlationId) {
  log('info', 'Executing compensation: cancel booking', correlationId, { processId });
  metrics.compensationCounter++;
  log('info', 'Compensation completed', correlationId, { processId, compensationCount: metrics.compensationCounter });
}

module.exports = { executeCompensation };