const config = require('../config');

async function simulateStepDelay() {
  const { min, max } = config.STEP_DELAY_MS;
  const delay = Math.random() * (max - min) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

module.exports = { simulateStepDelay };