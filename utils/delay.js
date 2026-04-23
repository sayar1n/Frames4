// Симуляция задержки шага.
 
const config = require('../config');

// Ждёт случайное время и возвращает фактическую задержку в мс. 
async function simulateStepDelay() {
  const { min, max } = config.STEP_DELAY_MS;
  const delay = Math.random() * (max - min) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

module.exports = { simulateStepDelay };