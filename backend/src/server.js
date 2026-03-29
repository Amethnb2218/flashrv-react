require('dotenv').config();
const http = require('http');
const prisma = require('./lib/prisma');
const app = require('./app');
const { initRealtime } = require('./realtime/hub');
const { resolvePublicBaseUrl } = require('./utils/publicUrl');
const PORT = process.env.PORT || 4000;

function getPublicUrls() {
  const backendBase = resolvePublicBaseUrl(process.env.API_URL);
  const frontendBase = resolvePublicBaseUrl(
    process.env.FRONTEND_URL,
    process.env.BASE_URL,
    process.env.ALLOWED_ORIGINS
  );
  const localHttpBase = `http://localhost:${PORT}`;
  const localWsBase = `ws://localhost:${PORT}`;

  return {
    backendBase: backendBase || localHttpBase,
    frontendBase: frontendBase || null,
    realtimeBase: backendBase
      ? backendBase.replace(/^http/i, 'ws')
      : localWsBase,
  };
}

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to database');
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }
}

async function shutdown() {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function startServer() {
  await connectDatabase();

  const server = http.createServer(app);
  initRealtime(server);

  // Start appointment reminder cron
  const { startReminderCron } = require('./services/reminderCron');
  startReminderCron();

  server.listen(PORT, () => {
    const urls = getPublicUrls();
    console.log(`Jolof'Era backend started on ${urls.backendBase}`);
    if (urls.frontendBase) {
      console.log(`Configured frontend URL: ${urls.frontendBase}`);
    }
    console.log(`Realtime WebSocket endpoint: ${urls.realtimeBase}/realtime`);
  });
}

startServer();
