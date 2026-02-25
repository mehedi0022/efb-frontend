# Naxt Ecommerce (Next.js Frontend + Admin)

`naxt-ecommerce` is the extracted standalone frontend/admin application for the Laravel ecommerce API.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Ant Design
- Formik + Yup
- Redux Toolkit + RTK Query
- React Icons

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run Laravel API (from `../project`) on port `8000`:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Default app URLs:

- Store: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin/login`

Make sure the Laravel API is running and `NEXT_PUBLIC_API_BASE_URL` points to it.

## Standalone Build (Deployment)

This project is configured with `output: 'standalone'`.

Build standalone bundle:

```bash
npm run build:standalone
```

After build, deploy/run from:

- `.next/standalone`
- `.next/standalone/.next/static`
- `.next/standalone/public`

Start standalone server:

```bash
npm run start:standalone
```

Or directly:

```bash
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

## Architecture

- Route handling:
  - `src/app/[[...slug]]/page.jsx`: store/user panel
  - `src/app/admin/[[...slug]]/page.jsx`: admin panel
- App providers:
  - `src/providers/AppProviders.jsx`
- Central API layer:
  - `src/store/api/publicApi.js`
  - `src/store/api/adminApi.js`
  - `src/store/api/createReauthBaseQuery.js`
- Token management:
  - `src/lib/auth/tokens.js`
- Environment config:
  - `src/config/env.js`

Legacy React modules from the previous Vite app are migrated under `src/legacy` and run inside Next.js route shells.

## Documentation

- `docs/PROJECT_STRUCTURE.md`
- `docs/AUTH_FLOW.md`
- `docs/API_INTEGRATION.md`
- `docs/STATE_MANAGEMENT.md`
