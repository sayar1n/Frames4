const { metrics } = require('../observability/metrics');
const { log } = require('../observability/logger');

async function executeCompensation(processId, correlationId) {
  log('info', 'Executing compensation: cancel booking', correlationId, { processId });
  // Здесь в реальном API был бы вызов отмены бронирования
  metrics.compensationCounter++;
  log('info', 'Compensation completed', correlationId, { processId, compensationCount: metrics.compensationCounter });
}

module.exports = { executeCompensation };