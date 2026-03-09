const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.DATABASE_URL || '';
const separator = dbUrl.includes('?') ? '&' : '?';
const urlWithTimeout = dbUrl && !dbUrl.includes('connect_timeout')
  ? `${dbUrl}${separator}connect_timeout=10&pool_timeout=10`
  : dbUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: urlWithTimeout,
    },
  },
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
});

module.exports = prisma;
