const express = require('express');
const config = require('./config');

const eventRoutes = require('./routes/event');
const stateRoutes = require('./routes/state');
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());

app.use(eventRoutes);
app.use(stateRoutes);
app.use(healthRoutes);
app.use(metricsRoutes);
app.use(adminRoutes);

module.exports = app;

if (require.main === module) {
  app.listen(config.PORT, () => console.log(`Running on port ${config.PORT}`));
}