const { WebSocketServer } = require('ws');
const { verifyToken } = require('../utils/jwt');

const clientsByUser = new Map();

const parseCookies = (rawCookie = '') =>
  String(rawCookie)
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return acc;
      const key = decodeURIComponent(pair.slice(0, eq).trim());
      const value = decodeURIComponent(pair.slice(eq + 1).trim());
      acc[key] = value;
      return acc;
    }, {});

const safeSend = (ws, payload) => {
  try {
    if (ws.readyState === 1) ws.send(JSON.stringify(payload));
  } catch (e) {
    // ignore
  }
};

const registerClient = (userId, ws) => {
  const key = String(userId);
  if (!clientsByUser.has(key)) clientsByUser.set(key, new Set());
  clientsByUser.get(key).add(ws);
};

const unregisterClient = (userId, ws) => {
  const key = String(userId);
  const set = clientsByUser.get(key);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clientsByUser.delete(key);
};

const emitToUser = (userId, payload) => {
  if (!userId) return;
  const set = clientsByUser.get(String(userId));
  if (!set || set.size === 0) return;
  set.forEach((ws) => safeSend(ws, payload));
};

function pushNotification(userId, notification) {
  emitToUser(userId, {
    type: 'notification:new',
    payload: notification,
  });
}

function pushChatMessage(userId, data) {
  emitToUser(userId, {
    type: 'chat:new',
    payload: data,
  });
}

function initRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/realtime' });
  wss.on('connection', (ws, req) => {
    try {
      const origin = `http://${req.headers.host}`;
      const url = new URL(req.url || '/realtime', origin);
      let token = url.searchParams.get('token');
      if (!token) {
        const cookies = parseCookies(req.headers.cookie || '');
        token = cookies.token || '';
      }
      if (!token) {
        ws.close(1008, 'Unauthorized');
        return;
      }
      const decoded = verifyToken(token);
      const userId = decoded?.userId;
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }
      ws.__userId = String(userId);
      registerClient(userId, ws);
      safeSend(ws, { type: 'realtime:connected', payload: { userId: ws.__userId } });

      ws.on('close', () => {
        unregisterClient(ws.__userId, ws);
      });

      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(String(raw || '{}'));
          if (parsed?.type === 'ping') {
            safeSend(ws, { type: 'pong', payload: { t: Date.now() } });
          }
        } catch (e) {
          // ignore invalid JSON
        }
      });
    } catch (error) {
      ws.close(1011, 'Server error');
    }
  });

  return wss;
}

module.exports = {
  initRealtime,
  pushNotification,
  pushChatMessage,
};

