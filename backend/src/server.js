require('dotenv').config();
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const app = require('./app');
const { initRealtime } = require('./realtime/hub');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

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

  server.listen(PORT, () => {
    console.log(`FlashRV backend started on http://localhost:${PORT}`);
    console.log('Realtime WebSocket endpoint: ws://localhost:' + PORT + '/realtime');
  });
}

startServer();

