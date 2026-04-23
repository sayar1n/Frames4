// Интеграционные тесты HTTP API (supertest): сценарии переходов, идемпотентность,
// компенсация, readiness при деградации, метрики, неверные переходы.
// beforeEach сбрасывает метрики и оба in-memory store.

const { resetMetrics } = require('../observability/metrics');
const { clearProcessStore } = require('../storage/processStore');
const { clearIdempotencyStore } = require('../storage/idempotencyStore');
const request = require('supertest');
const app = require('../index');

describe('Машина состояний бронирования', () => {
  beforeEach(() => {
    resetMetrics();
    clearProcessStore();
    clearIdempotencyStore();
  });

  const processId = 'proc-1';
  const idempotencyKey = 'evt-1';
  const correlationId = 'test-corr-123';

  test('1. Новый процесс -> accept_request -> ЗаявкаПринята', async () => {
    const res = await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'accept_request', idempotencyKey, correlationId });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ЗаявкаПринята');
    expect(res.body.processed).toBe(true);
  });

  test('2. Идемпотентность: повторное событие не меняет состояние', async () => {
    await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'accept_request', idempotencyKey, correlationId });
    const res2 = await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'accept_request', idempotencyKey, correlationId });
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
    expect(res2.body.state).toBe('ЗаявкаПринята');
  });

  test('3. Нормальный поток: accept_request -> book -> grant_access -> complete', async () => {
    const steps = ['accept_request', 'book', 'grant_access', 'complete'];
    let currentState = '';
    for (const step of steps) {
      const res = await request(app)
        .post('/api/event')
        .send({ processId, eventType: step, idempotencyKey: `${step}-key`, correlationId });
      expect(res.status).toBe(200);
      currentState = res.body.state;
    }
    expect(currentState).toBe('Завершён');
  });

  test('4. Сбой на grant_access -> компенсация и КомпенсацияВыполнена', async () => {
    await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'accept_request', idempotencyKey: 'k1', correlationId });
    await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'book', idempotencyKey: 'k2', correlationId });

    const res = await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'grant_access', idempotencyKey: 'k3', correlationId, simulateFailure: true });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('КомпенсацияВыполнена');
    expect(res.body.compensationExecuted).toBe(true);
  });

  test('5. Компенсация увеличивает счётчик метрик и может вызвать деградацию', async () => {
    for (let i = 0; i < 4; i++) {
      const procId = `proc-deg-${i}`;
      await request(app)
        .post('/api/event')
        .send({ processId: procId, eventType: 'accept_request', idempotencyKey: `a${i}`, correlationId });
      await request(app)
        .post('/api/event')
        .send({ processId: procId, eventType: 'book', idempotencyKey: `b${i}`, correlationId });
      await request(app)
        .post('/api/event')
        .send({ processId: procId, eventType: 'grant_access', idempotencyKey: `c${i}`, correlationId, simulateFailure: true });
    }
    const readyRes = await request(app).get('/health/ready');
    expect(readyRes.status).toBe(503);
    expect(readyRes.body.reason).toBe('critical_degradation');
  });

  test('6. Liveness всегда успешен', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  test('7. Метрики показывают счётчики и среднюю задержку', async () => {
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/event')
        .send({
          processId: `metric-proc-${i}`,
          eventType: 'accept_request',
          idempotencyKey: `m${i}`,
          correlationId
        });
    }
    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.counters.successfulTransitions).toBeGreaterThanOrEqual(2);
    expect(metricsRes.body.averageStepLatencyMs.accept_request).toBeDefined();
  });

  test('8. Неверный переход возвращает ошибку', async () => {
    const res = await request(app)
      .post('/api/event')
      .send({ processId: 'bad', eventType: 'complete', idempotencyKey: 'bad', correlationId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(true);
  });

  test('9. Русские имена событий (UTF-8) по-прежнему принимаются', async () => {
    const res = await request(app)
      .post('/api/event')
      .send({ processId: 'ru-proc', eventType: 'ПринятьЗаявку', idempotencyKey: 'ru-1', correlationId });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ЗаявкаПринята');
  });
});
