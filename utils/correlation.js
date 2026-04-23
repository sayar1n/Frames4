// Генерация UUID для сквозной трассировки запроса в логах (если клиент не передал correlationId).
 
const crypto = require('crypto');

// Возвращает crypto.randomUUID(). 
function generateCorrelationId() {
  return crypto.randomUUID();
}
module.exports = { generateCorrelationId };