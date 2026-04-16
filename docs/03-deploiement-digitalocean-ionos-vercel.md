# Deployment Notes for DigitalOcean, IONOS, and Vercel

This repository is ready for a split deployment model:

- Frontend: Vercel
- Backend: DigitalOcean Droplet / App Platform, or IONOS VPS
- Database: managed PostgreSQL or PostgreSQL on the VPS

## Recommended Production Topology

Use `www.jolofera.com` for the frontend and `api.jolofera.com` for the API.

- `www.jolofera.com` -> Vercel project
- `api.jolofera.com` -> Node/Express backend
- Shared cookies:
  - `COOKIE_SECURE=true`
  - `COOKIE_SAMESITE=none`
  - `COOKIE_DOMAIN=.jolofera.com`

## Required Frontend Variables

Set these in Vercel:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=https://api.jolofera.com/api
VITE_API_TIMEOUT_MS=15000
VITE_ADMIN_PATH=/backoffice
```

## Required Backend Variables

Set these on DigitalOcean or IONOS:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=replace_with_64_plus_random_chars
REFRESH_SECRET=replace_with_64_plus_random_chars
CSRF_SECRET=replace_with_32_plus_random_chars
FRONTEND_URL=https://www.jolofera.com
BASE_URL=https://www.jolofera.com
API_URL=https://api.jolofera.com
ALLOWED_ORIGINS=https://www.jolofera.com,https://jolofera.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
COOKIE_DOMAIN=.jolofera.com
```

Also configure the provider credentials you actively use:

- Google OAuth
- Cloudinary
- DexPay / PayDunya / Wave
- Web Push VAPID
- OpenAI if the assistant stays enabled

## Vercel

Use the root project for the frontend only.

1. Import the GitHub repository into Vercel.
2. Keep the default framework preset for Vite.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Add the frontend environment variables above.
6. Point `www.jolofera.com` to the Vercel project.

Notes:

- `vercel.json` already includes SPA rewrites, security headers, and immutable caching for hashed assets.
- The frontend should call the API through `VITE_API_URL=https://api.jolofera.com/api`.

## DigitalOcean

Two good options:

### Option A: Droplet

Recommended when you want full control over Nginx, PM2, uploads proxying, and WebSocket handling.

1. Create an Ubuntu 22.04 or 24.04 Droplet.
2. Install Node 20+, Nginx, PostgreSQL, and PM2.
3. Clone the repository and install dependencies.
4. Run:

```bash
cd backend
npm install --omit=dev
npx prisma generate
npx prisma migrate deploy
pm2 start ecosystem.config.cjs
pm2 save
```

5. Put Nginx in front of the backend and terminate TLS there.
6. Point `api.jolofera.com` to the Droplet IP.

### Option B: App Platform

Works well if you do not need custom Nginx logic.

- Service root: `backend`
- Build command: `npm run build`
- Run command: `npm run start`
- Expose port `4000`
- Add the backend environment variables

If App Platform is used, keep Vercel for the frontend and connect the domains separately.

## IONOS

IONOS is best used as a VPS target for this backend.

1. Provision a Linux VPS.
2. Install Node 20+, Nginx, and PostgreSQL.
3. Deploy the backend exactly like the Droplet flow.
4. Use `backend/ecosystem.config.cjs` with PM2.
5. Put `api.jolofera.com` behind HTTPS with Nginx.

Important:

- If IONOS sits behind a proxy or load balancer, keep `NODE_ENV=production` and preserve `X-Forwarded-*` headers.
- Verify `ALLOWED_ORIGINS`, `API_URL`, and `COOKIE_DOMAIN` after DNS is live.

## Post-Deploy Validation

Run these checks before redeploy approval:

1. `GET https://api.jolofera.com/health` returns `200`.
2. Login, refresh, and logout work without bearer tokens in browser storage.
3. A cross-origin page cannot call `/api/auth/login`, `/api/auth/logout`, or `/api/auth/refresh`.
4. `/api/payments/confirm-on-site` only works for the booking owner, salon owner, or admins.
5. Promoting a user to `ADMIN` only works through `SUPER_ADMIN`.
6. Frontend assets are served with long cache headers, while service workers stay `no-store`.

## Push / PR Checklist

- Include the auth/session hardening changes.
- Mention that frontend auth now relies on secure cookies instead of persisted JWTs.
- Mention the `backend/ecosystem.config.cjs` template for VPS deployments.
- Mention this document and `vercel.json` in the PR description so the owner can redeploy quickly.
