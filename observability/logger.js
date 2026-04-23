// Структурированный лог: JSON со временем, уровнем, correlationId и доп. полями.
function log(level, message, correlationId, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    message,
    ...extra
  };
  console.log(JSON.stringify(entry));
}

module.exports = { log };