# State Management Setup

## Store

`src/store/index.js`

Configured reducers:

- `publicApi.reducer`
- `adminApi.reducer`

Middleware:

- `publicApi.middleware`
- `adminApi.middleware`

## Query-driven state

The app is primarily API-state driven via RTK Query.

Context wrappers in `src/legacy/context` consume RTK Query hooks and expose UI-ready data:

- `AuthContext`
- `CartContext`
- `SettingsContext`
- `SiteDataContext`

## Why this structure

- Keeps server data normalized and cached at the API layer.
- Reduces manual global slice complexity.
- Makes migration from legacy modules incremental while preserving behavior.
