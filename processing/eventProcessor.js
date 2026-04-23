const { STATES, transitions } = require('../domain/stateMachine');
const { executeCompensation } = require('../domain/compensation');
const { getState, setState, has } = require('../storage/processStore');
const { isProcessed, markProcessed } = require('../storage/idempotencyStore');
const { log } = require('../observability/logger');
const { metrics, recordLatency } = require('../observability/metrics');
const { simulateStepDelay } = require('../utils/delay');

async function processEvent(processId, eventType, idempotencyKey, correlationId, simulateFailure = false) {
  // 1. Идемпотентность
  if (isProcessed(processId, idempotencyKey)) {
    metrics.retryDeliveries++;
    const currentState = getState(processId) || STATES.NEW;
    log('info', 'Повтор (duplicate ignored)', correlationId, { processId, eventType, idempotencyKey, currentState });
    return { processed: false, duplicate: true, state: currentState };
  }

  // 2. Текущее состояние
  let currentState = getState(processId);
  if (!currentState) {
    currentState = STATES.NEW;
    setState(processId, currentState);
    log('info', 'Initialized new process', correlationId, { processId });
  }

  // 3. Проверка перехода (обычного или сбойного для ВыдатьДоступ)
  const allowedNext = transitions[currentState]?.[eventType];
  const isGrantWithFailure = (eventType === 'ВыдатьДоступ' && currentState === STATES.RESOURCE_BOOKED && simulateFailure);

  if (!allowedNext && !isGrantWithFailure) {
    metrics.errorTransitions++;
    log('error', 'Invalid transition', correlationId, { processId, currentState, eventType });
    return { processed: false, error: true, state: currentState };
  }

  const start = Date.now();
  let newState = currentState;
  let compensationDone = false;

  try {
    const stepDelay = await simulateStepDelay();
    const latencyMs = Date.now() - start;
    recordLatency(eventType, latencyMs);

    if (isGrantWithFailure) {
      // Сбой на шаге ВыдатьДоступ -> компенсация
      log('error', 'Step failed: ВыдатьДоступ', correlationId, { processId, simulateFailure });
      metrics.errorTransitions++;
      await executeCompensation(processId, correlationId);
      compensationDone = true;
      newState = STATES.COMPENSATED;
      setState(processId, newState);
      log('info', 'Transition with compensation', correlationId, { from: currentState, to: newState });
      metrics.successfulTransitions++; // Считаем обработку с компенсацией успешной (система восстановлена)
    } 
    else {
      // Нормальный переход
      newState = allowedNext;
      setState(processId, newState);
      metrics.successfulTransitions++;
      log('info', 'State transition', correlationId, { from: currentState, to: newState, event: eventType });
    }

    markProcessed(processId, idempotencyKey);
    return {
      processed: true,
      duplicate: false,
      state: newState,
      compensationExecuted: compensationDone,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    metrics.errorTransitions++;
    log('error', 'Unexpected error', correlationId, { processId, eventType, error: err.message });
    return { processed: false, error: true, state: currentState, message: err.message };
  }
}

module.exports = { processEvent };