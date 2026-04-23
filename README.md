# Сервис бронирования переговорок (State Machine with Compensation)

Учебная веб-служба, реализующая процесс бронирования переговорной комнаты в 4 шага с поддержкой идемпотентности, компенсации при сбоях и полной наблюдаемостью (логи, метрики, health checks).

## Установка и запуск

```bash
# 1. Клонировать/перейти в папку проекта
cd Frames4

# 2. Установить зависимости
npm install express

# 3. Запустить сервер
node index.js
# или с авто-перезагрузкой:
npx nodemon index.js
```

Сервер запустится на `http://localhost:3000` (порт настраивается в `config.js`).

## Машина состояний

| Состояние (рус)         | Описание                     |
|------------------------|------------------------------|
| `Новый`                | Начальное состояние         |
| `ЗаявкаПринята`        | Заявка принята               |
| `РесурсЗабронирован`   | Ресурс забронирован          |
| `ДоступВыдан`          | Доступ выдан                 |
| `Завершён`             | Процесс успешно завершён     |
| `КомпенсацияВыполнена` | Откат после сбоя на шаге выдачи доступа |

### Допустимые переходы (без сбоев)

События в API — **английские** идентификаторы (удобно для `curl` и JSON):

- `Новый` → **`accept_request`** → `ЗаявкаПринята`
- `ЗаявкаПринята` → **`book`** → `РесурсЗабронирован`
- `РесурсЗабронирован` → **`grant_access`** → `ДоступВыдан`
- `ДоступВыдан` → **`complete`** → `Завершён`

Регистр у событий не важен (`Grant_Access` и т.п.). Дополнительно принимаются **устаревшие русские** имена при корректной UTF-8 передаче (например из Postman).

> При сбое на шаге **`grant_access`** (если передан флаг `simulateFailure: true`) выполняется **компенсация** (отмена брони), и процесс переходит в `КомпенсацияВыполнена`.

## Идемпотентность

Каждое событие идентифицируется парой `(processId, idempotencyKey)`. При повторной доставке того же события состояние процесса **не меняется**, в ответе приходит `"duplicate": true`.

## API эндпоинты

### 1. Отправить событие
```
POST /api/event
Content-Type: application/json
```
**Тело запроса:**
```json
{
  "processId": "string (обязательно)",
  "eventType": "accept_request | book | grant_access | complete",
  "idempotencyKey": "string (обязательно)",
  "correlationId": "string (опционально, генерируется если нет)",
  "simulateFailure": "boolean (опционально, только для eventType=grant_access)"
}
```
**Ответ (200 OK):**
```json
{
  "processed": true,
  "duplicate": false,
  "state": "ЗаявкаПринята",
  "correlationId": "uuid",
  "compensationExecuted": false,
  "latencyMs": 23
}
```

### 2. Получить состояние процесса
```
GET /api/state/:processId
```
**Пример:** `GET /api/state/proc-123`  
**Ответ:**
```json
{
  "processId": "proc-123",
  "state": "РесурсЗабронирован",
  "correlationId": "uuid"
}
```

### 3. Health checks
- **Liveness** (всегда `200`): `GET /health/live`
- **Readiness** (становится `503` после 3 компенсаций): `GET /health/ready`

### 4. Метрики
```
GET /metrics
```
Ответ содержит счётчики и среднюю задержку по каждому шагу:
```json
{
  "counters": {
    "successfulTransitions": 5,
    "errorTransitions": 1,
    "retryDeliveries": 2,
    "compensationCounter": 3
  },
  "averageStepLatencyMs": {
    "accept_request": 31.25,
    "book": 28.70,
    "grant_access": 45.33,
    "complete": 22.15
  },
  "totalProcesses": 4,
  "totalIdempotencyKeys": 12
}
```

### 5. Сброс метрик (админский, для тестов)
```
POST /admin/reset
```

## Тестирование

```bash
# Установить зависимости для тестов
npm install -D jest supertest

# Запустить тесты
npm test
```

Все тесты (`test/service.test.js`) проверяют:
- корректные переходы
- идемпотентность
- компенсацию при сбое
- деградацию readiness
- метрики и задержки
- обработку неверных переходов

## Наблюдаемость (Observability)

- **Логирование**: каждая запись журнала содержит `correlationId`, уровень, сообщение и дополнительные поля. Логи выводятся в `stdout` в формате JSON.
- **Метрики**: доступны через `GET /metrics`.
- **Health probes**: liveness (жив) и readiness (готовность с учётом деградации). Критическая деградация наступает при количестве компенсаций > 3 (настраивается в `config.js`).
- **Компенсация**: при сбое на `grant_access` вызывается `executeCompensation()`, которая логируется и увеличивает счётчик.

## Структура проекта

```
Frames4/
├── index.js                 # точка входа
├── config.js                # порт, порог компенсаций
├── domain/
│   ├── stateMachine.js      # состояния и переходы
│   └── compensation.js      # логика отката брони
├── storage/
│   ├── processStore.js      # in-memory хранилище состояний
│   ├── idempotencyStore.js  # Set обработанных (processId+key)
│   └── lockStore.js         # блокировки для упорядочивания
├── processing/
│   └── eventProcessor.js    # основной обработчик (идемпотентность, переходы, компенсация, метрики)
├── observability/
│   ├── logger.js            # логгер с correlationId
│   └── metrics.js           # счётчики и гистограммы
├── routes/
│   ├── event.js, state.js, health.js, metrics.js, admin.js
└── utils/
    ├── delay.js             # симуляция задержки шага
    ├── correlation.js       # генерация UUID
    └── eventType.js         # нормализация eventType (EN + опционально RU UTF-8)
```

## Настройка

Все настройки в `config.js`:

```javascript
module.exports = {
  PORT: 3000,
  COMPENSATION_THRESHOLD: 3,   // после 3 компенсаций readiness = 503
  STEP_DELAY_MS: { min: 10, max: 50 }  // симуляция задержки шага
};
```

## Пример использования (curl)

Отдельные `processId` для разных сценариев, чтобы не мешать уже пройденным шагам в памяти сервера.

### Успешный сценарий до `complete` (ожидается `Завершён`)

```bash
# 1. Принять заявку
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-happy","eventType":"accept_request","idempotencyKey":"h1"}'

# 2. Забронировать
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-happy","eventType":"book","idempotencyKey":"h2"}'

# 3. Выдать доступ (без сбоя — не передавать simulateFailure)
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-happy","eventType":"grant_access","idempotencyKey":"h3"}'

# 4. Завершить — в ответе поле state должно стать «Завершён»
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-happy","eventType":"complete","idempotencyKey":"h4"}'

# 5. Проверить состояние (должно совпадать с ответом шага 4)
curl http://localhost:3000/api/state/meet-happy
```

### Сценарий с компенсацией (другой процесс)

```bash
# 1–2 как выше, затем сбой на grant_access
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-fail","eventType":"accept_request","idempotencyKey":"f1"}'

curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-fail","eventType":"book","idempotencyKey":"f2"}'

curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"processId":"meet-fail","eventType":"grant_access","idempotencyKey":"f3","simulateFailure":true}'

curl http://localhost:3000/api/state/meet-fail
```

### Метрики

```bash
curl http://localhost:3000/metrics
```

---

**Разработано в учебных целях.** Полностью соответствует требованиям: машина состояний (4+ шагов), идемпотентность, компенсация, наблюдаемость, health checks, метрики (счётчики + латентность).
