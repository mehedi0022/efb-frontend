# Authentication Flow

## Backend token model

Laravel now issues JWT token pairs:

- `access_token` (short lived)
- `refresh_token` (longer lived)

Flows are implemented for both:

- Customer: `/api/v1/login`, `/api/v1/register`, `/api/v1/refresh-token`, `/api/v1/logout`, `/api/v1/user`
- Admin: `/api/admin/login`, `/api/admin/refresh-token`, `/api/admin/logout`, `/api/admin/me`

## Frontend token storage

### Customer

- Access token: `localStorage[token]`
- Refresh token: `localStorage[refresh_token]`

### Admin

- Access token: `localStorage[auth_token]`
- Refresh token: `localStorage[admin_refresh_token]`

## Auto refresh behavior

Both RTK Query base queries auto-attempt refresh on `401`.

- If refresh succeeds: tokens are rotated and original request is retried.
- If refresh fails: local tokens are cleared and user is redirected to login (admin) or treated as logged out (store).

## Route protection

- Admin UI routes are guarded in `src/legacy/admin/App.jsx` (`RequireAdminAuth`).
- Backend admin APIs are protected via `jwt:admin` middleware.
