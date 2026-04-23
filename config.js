module.exports = {
  PORT: process.env.PORT || 3000,
  COMPENSATION_THRESHOLD: 3,   // при превышении готовность становится false
  STEP_DELAY_MS: { min: 10, max: 50 }
};