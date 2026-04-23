// Нормализация типа события.
const { EVENTS } = require('../domain/stateMachine');

const CANONICAL = Object.values(EVENTS);

const LEGACY_RU_TO_CANONICAL = {
  ПринятьЗаявку: EVENTS.ACCEPT_REQUEST,
  Забронировать: EVENTS.BOOK,
  ВыдатьДоступ: EVENTS.GRANT_ACCESS,
  Завершить: EVENTS.COMPLETE
};

function resolveEventType(raw) {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const fromLegacy = LEGACY_RU_TO_CANONICAL[trimmed];
  if (fromLegacy) return fromLegacy;
  const lower = trimmed.toLowerCase();
  const found = CANONICAL.find((e) => e.toLowerCase() === lower);
  return found || null;
}

function allowedEventTypesMessage() {
  return `Allowed: ${CANONICAL.join(', ')} (optional legacy UTF-8 Russian: ${Object.keys(LEGACY_RU_TO_CANONICAL).join(', ')})`;
}

module.exports = { resolveEventType, allowedEventTypesMessage, CANONICAL };
