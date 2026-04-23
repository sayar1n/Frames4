module.exports = {
  PORT: process.env.PORT || 3000,
  COMPENSATION_THRESHOLD: 3, // порог компенсаций для readiness
  STEP_DELAY_MS: { min: 10, max: 50 } // диапазон случайной задержки имитации шага
};