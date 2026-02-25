# Project Structure

## Top-level

- `src/app`: Next.js App Router entrypoints/layout.
- `src/providers`: global providers (Redux + Ant Design).
- `src/store`: Redux store and RTK Query API slices.
- `src/config`: central environment/config utilities.
- `src/lib`: auth token helpers and shared utilities.
- `src/features`: feature-level entry components for migrated apps.
- `src/legacy`: extracted user/admin React modules from the original Vite app.
- `public`: static assets (frontend media/uploads).

## Runtime separation

- User panel runs from: `src/features/legacy/LegacyUserApp.jsx`
- Admin panel runs from: `src/features/legacy/LegacyAdminApp.jsx`

## API boundaries

- Public/user API endpoints (`/api/v1/...`) handled by `publicApi` slice.
- Admin API endpoints (`/api/admin/...`) handled by `adminApi` slice.
