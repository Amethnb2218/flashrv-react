# Jolof'Era / FlashRV

Jolof'Era is the public product brand. `FlashRV` is the historical repository
name used for the codebase.

This repository contains the frontend and backend for a beauty marketplace and
booking platform focused on Senegal. Users can discover salons, book services,
buy products, manage appointments and orders, and access dedicated client,
partner, and admin experiences.

## Highlights

- Salon discovery, service detail pages, and booking flows
- Boutique catalog, cart, checkout, and order tracking
- Client, partner, and admin dashboards
- Google OAuth and account-based authentication
- Online and offline payment flows depending on configuration
- Media uploads with Cloudinary
- Realtime updates, notifications, and PWA-related UX

## Tech Stack

### Frontend

- React 18
- Vite 7
- Tailwind CSS 3
- React Router
- Framer Motion
- React Hot Toast

### Backend

- Node.js
- Express
- Prisma
- WebSocket / realtime services
- Cloudinary
- Google Auth
- Multiple payment integrations

## Repository Layout

```text
flashrv-react/
|-- backend/           # Express + Prisma API
|-- public/            # Static public assets
|-- src/               # React application
|   |-- api/
|   |-- components/
|   |-- context/
|   |-- data/
|   |-- pages/
|   `-- utils/
|-- .env.example
|-- package.json
|-- tailwind.config.js
`-- vite.config.js
```

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Amethnb2218/flashrv-react.git
cd flashrv-react
```

### 2. Install dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
cd backend
npm install
cd ..
```

### 3. Configure environment variables

Frontend:

```bash
copy .env.example .env.local
```

Backend:

```bash
copy backend\.env.example backend\.env
```

Use the example files as the source of truth for the available variables.

Important frontend variables:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_URL` (optional in local development if the Vite proxy is used)
- `VITE_ADMIN_PATH` (optional)

Important backend variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FRONTEND_URL`
- `BASE_URL`
- `API_URL`

Payment keys are optional until you enable the corresponding providers.

### 4. Run the backend

```bash
cd backend
npm run dev
```

By default the backend runs on `http://127.0.0.1:4000`.

### 5. Run the frontend

In a second terminal:

```bash
npm run dev
```

By default the frontend runs on `http://127.0.0.1:3000`.

## Development Notes

- The Vite dev server proxies `/api` and `/uploads` to the backend on port `4000`.
- The canonical public frontend domain used by the project is
  `https://www.jolofera.com`.
- The backend example configuration includes Cloudinary, payment providers,
  OpenAI-related optional services, and web push keys.

## Scripts

### Frontend

- `npm run dev` - start the frontend dev server
- `npm run build` - build the frontend
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm run seo:indexnow` - submit SEO index updates

### Backend

- `npm run dev` - start the backend with nodemon
- `npm run start` - start the backend with node
- `npm run build` - generate Prisma client
- `npm run db:migrate` - run Prisma migrations
- `npm run db:generate` - regenerate Prisma client
- `npm run db:push` - push Prisma schema changes
- `npm run db:studio` - open Prisma Studio

## Deployment

The repository is structured for a split deployment model:

- Frontend on a static host such as Vercel
- Backend on a separate Node-compatible host
- Environment variables managed independently per environment

Review [vercel.json](./vercel.json)
for the frontend routing and security header configuration.

For production handoff and redeploy instructions, see:

- [docs/02-guide-deploiement-internet.md](./docs/02-guide-deploiement-internet.md)
- [docs/03-deploiement-digitalocean-ionos-vercel.md](./docs/03-deploiement-digitalocean-ionos-vercel.md)

## Contribution Policy

This repository is private and proprietary. Contributions, forks, reuse, and
distribution are not open by default.

If you want to collaborate, request permission from the owner first.

## License

This project is distributed under a proprietary license.

See [LICENSE](./LICENSE)
for the full legal terms.

## Contact

Owner: Mouhamed Sall  
GitHub: https://github.com/Amethnb2218  
Email: amethsl2218@gmail.com
