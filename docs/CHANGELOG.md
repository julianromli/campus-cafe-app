# Changelog

## 2026-04-16

### Sprint 1 foundation
- Replaced the empty Convex schema with the full Campus Cafe application model, including indexes for users, tables, reservations, events, menu, orders, payments, and notifications.
- Added server-side auth helpers in `packages/backend/convex/lib/auth.ts` and synchronized Better Auth users into the app `users` table using an `authId` mapping plus Better Auth triggers.
- Added `packages/backend/convex/users.ts` with current-user, admin lookup, profile update, role assignment, and access revocation APIs.
- Expanded the React Router file-route skeleton for public, customer, staff, and admin sections using role-aware layout routes.
- Added reusable `customer`, `staff`, and `admin` layouts plus a `RouteGuard` component backed by `api.users.getMe`.
- Updated auth-facing frontend flows to use dedicated `/sign-in` and `/sign-up` routes, redirect handling, optional Google sign-in entry points, and the new app user menu.
- Kept email verification delivery deferred until the email infrastructure sprint; Google auth is now configuration-ready via environment variables.
