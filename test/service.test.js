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

  test('1. Новый процесс -> ПринятьЗаявку -> ЗаявкаПринята', async () => {
    const res = await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'ПринятьЗаявку', idempotencyKey, correlationId });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ЗаявкаПринята');
    expect(res.body.processed).toBe(true);
  });

  test('2. Идемпотентность: повторное событие не меняет состояние', async () => {
    // Первый раз
    await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'ПринятьЗаявку', idempotencyKey, correlationId });
    // Второй раз с тем же ключом
    const res2 = await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'ПринятьЗаявку', idempotencyKey, correlationId });
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
    expect(res2.body.state).toBe('ЗаявкаПринята'); // состояние не изменилось
  });

  test('3. Нормальный поток: ПринятьЗаявку -> Забронировать -> ВыдатьДоступ -> Завершить', async () => {
    const steps = ['ПринятьЗаявку', 'Забронировать', 'ВыдатьДоступ', 'Завершить'];
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

  test('4. Сбой на шаге "ВыдатьДоступ" -> компенсация и состояние "КомпенсацияВыполнена"', async () => {
    // Подготовка: доходим до состояния "РесурсЗабронирован"
    await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'ПринятьЗаявку', idempotencyKey: 'k1', correlationId });
    await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'Забронировать', idempotencyKey: 'k2', correlationId });

    // Шаг с симуляцией сбоя
    const res = await request(app)
      .post('/api/event')
      .send({ processId, eventType: 'ВыдатьДоступ', idempotencyKey: 'k3', correlationId, simulateFailure: true });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('КомпенсацияВыполнена');
    expect(res.body.compensationExecuted).toBe(true);
  });

  test('5. Компенсация увеличивает счётчик метрик и может вызвать деградацию', async () => {
    // Три компенсации подряд
    for (let i = 0; i < 4; i++) {
      const procId = `proc-deg-${i}`;
      await request(app)
        .post('/api/event')
        .send({ processId: procId, eventType: 'ПринятьЗаявку', idempotencyKey: `a${i}`, correlationId });
      await request(app)
        .post('/api/event')
        .send({ processId: procId, eventType: 'Забронировать', idempotencyKey: `b${i}`, correlationId });
      await request(app)
        .post('/api/event')
        .send({ processId: procId, eventType: 'ВыдатьДоступ', idempotencyKey: `c${i}`, correlationId, simulateFailure: true });
    }
    // Проверка readiness (должен быть 503, т.к. компенсаций > 3)
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
  // Отправляем события для двух разных процессов, чтобы оба успешно обработались
  for (let i = 0; i < 2; i++) {
    await request(app)
      .post('/api/event')
      .send({ 
        processId: `metric-proc-${i}`,  // разные processId
        eventType: 'ПринятьЗаявку', 
        idempotencyKey: `m${i}`, 
        correlationId 
      });
  }
  const metricsRes = await request(app).get('/metrics');
  expect(metricsRes.status).toBe(200);
  expect(metricsRes.body.counters.successfulTransitions).toBeGreaterThanOrEqual(2);
  expect(metricsRes.body.averageStepLatencyMs['ПринятьЗаявку']).toBeDefined();
});

  test('8. Неверный переход возвращает ошибку', async () => {
    // Попытка вызвать "Завершить" из состояния "Новый"
    const res = await request(app)
      .post('/api/event')
      .send({ processId: 'bad', eventType: 'Завершить', idempotencyKey: 'bad', correlationId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(true);
  });
});