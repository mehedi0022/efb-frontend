# API Integration

## Base URL

Configured from `NEXT_PUBLIC_API_BASE_URL` in `src/config/env.js`.

- Public API base: `${NEXT_PUBLIC_API_BASE_URL}/api/v1`
- Admin API base: `${NEXT_PUBLIC_API_BASE_URL}/api`

Local development value:

- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`

## Service layer

- `src/store/api/createReauthBaseQuery.js`
  - shared token injection
  - 401 refresh flow
  - retry after refresh

- `src/store/api/publicApi.js`
  - store/user endpoints
  - cart header propagation (`X-Cart-ID`)

- `src/store/api/adminApi.js`
  - admin endpoints
  - generic fetch/action hooks used across admin modules

## Response handling

Primary convention:

- `success` boolean
- `message` string
- `data` payload

Legacy-compatible payload keys are still supported where needed (e.g. `token`, `cart_id`).
