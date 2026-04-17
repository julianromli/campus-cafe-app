# Changelog

## 2026-04-17

### Documentation — Events scope (PRD v1.3)
- **PRD (`docs/PRD.md`):** Reframed §3.2 as **Event Discovery (information-only)** — in-app listing + detail + **outbound official URL**; removed in-app registration, ticketing, Mayar event payments, QR tickets, attendees, and event→registration table linking from product scope; updated success metrics, roles, schema sketch, roadmap, and non-goals accordingly.
- **Design (`docs/DESIGN.md`):** Event detail and admin event forms now center on **external link CTA**; removed registration success / QR ticket UI; admin attendees page removed from spec; dashboard charts no longer assume event-attendee metrics; page numbering adjusted (former Page 10+ shifted after removing registration-success page).
- **Backlog (`docs/BACKLOG.md`):** EPIC 2 rewritten for **B-017 / B-019 / B-020 / B-022**; **B-018, B-021, B-023** and notification tasks **B-036, B-038** marked **Cancelled**; **B-031** dependencies updated (no B-018); appendix file tree and Mayar webhook notes aligned with reservations-only payments for product scope.

### Phase 6 — User management (B-033, B-034)
- Schema: optional `avatarStorageId` on `users` in `packages/backend/convex/schema.ts`; `getMe` / `getById` / profile mutations resolve signed avatar URLs from Convex storage when set.
- `packages/backend/convex/users.ts`: `generateAvatarUploadUrl`, `updateProfile` supports `avatarStorageId` (including clear), deletes replaced blobs; admin `listStaff`, `findByEmail`; self-lockout on `setRole` / `revokeAccess`.
- Customer profile at `apps/web/src/routes/_customer.profile.tsx`: editable name/phone, avatar upload/remove (2 MB, image/*), skeleton loading.
- Admin staff at `apps/web/src/routes/admin.staff.tsx`: staff+admin table with change role, revoke access, promote-by-email (no invite email — direct role assignment per product choice).
- Updated `docs/BACKLOG.md` task statuses for B-033 and B-034.

### Phase 5 — Admin dashboard (B-031, B-032)
- Added `packages/backend/convex/analytics.ts` with admin-only `todayOverview` and `thirtyDayTrends` queries: `referenceTimestamp` from the client (no `Date.now()` in queries); live metrics for reservations, table occupancy, and paid revenue; `activeOrders`, `todayEventRegistrations`, and per-day `eventRegistrations` / `orderCount` in trends return `0` until B-018 / B-028 populate data (TODO markers in code).
- Added shadcn `chart` primitive at `packages/ui/src/components/chart.tsx` (Recharts v3–compatible typings: `Partial<TooltipContentProps>`, `DefaultLegendContentProps` for legend); added `recharts` to `@campus-cafe/ui` and `apps/web`.
- Implemented `/admin/dashboard`: stat cards (`StatCard`), 30-day reservations line chart (`ReservationsTrendChart`), skeleton loading, and placeholder cards for event/order trend charts pending later phases.
- Updated `docs/BACKLOG.md` task statuses for B-031 and B-032.

## 2026-04-16

### B-015 and B-016 follow-up
- Upgraded `apps/web/src/routes/_customer.my-reservations.tsx` with Upcoming/Past tabs, normalized status badges, and a cancellation confirmation flow wired to `api.reservations.cancel`.
- Extended `packages/backend/convex/reservations.ts` with a staff-oriented reservations board query that joins customer display info for operational views without extra client-side lookups.
- Updated `apps/web/src/components/reserve/floor-plan.tsx` so staff/admin flows can select booked and occupied tables while keeping customer reservation mode limited to available tables.
- Replaced the placeholder in `apps/web/src/routes/staff.reservations.tsx` with a live operations board featuring floor-plan and list views, filters, detail side panel, and mark-occupied/release actions.
- Synced `docs/BACKLOG.md` so B-015 and B-016 are marked done and their file paths match the repo’s flat-route naming.

### Sprint 2 reservation slice
- Added `packages/backend/convex/tables.ts` with public table availability queries, admin CRUD, and staff/admin table status transitions.
- Added `packages/backend/convex/reservations.ts` with availability checks, pending reservation creation, customer reservation queries, cancellation rules, and idempotent internal confirmation logic.
- Added `packages/backend/convex/payments.ts` plus a `/mayar/webhook` route in `packages/backend/convex/http.ts` to create Mayar payment links, map payment references to reservations, and confirm bookings from webhook callbacks.
- Replaced the admin tables placeholder with a functional floor-plan editor in `apps/web/src/routes/admin.tables.tsx`, including drag-to-reposition behavior and add/edit/deactivate/delete controls.
- Added shared floor-plan UI primitives in `apps/web/src/components/reserve/` and connected the customer `/reserve` page to live table availability and the reservation slide-over flow.
- Updated `apps/web/src/routes/_customer.my-reservations.tsx` to render real reservation data and handle the `?success=true` return state after Mayar redirects back to the app.
- Reservation payments now depend on `MAYAR_API_KEY`, `SITE_URL`, and `RESERVATION_PRICE_PER_HOUR`; `MAYAR_PAYMENT_CREATE_URL` can override the default create-payment endpoint if sandbox or API paths differ.

### Sprint 1 foundation
- Replaced the empty Convex schema with the full Campus Cafe application model, including indexes for users, tables, reservations, events, menu, orders, payments, and notifications.
- Added server-side auth helpers in `packages/backend/convex/lib/auth.ts` and synchronized Better Auth users into the app `users` table using an `authId` mapping plus Better Auth triggers.
- Added `packages/backend/convex/users.ts` with current-user, admin lookup, profile update, role assignment, and access revocation APIs.
- Expanded the React Router file-route skeleton for public, customer, staff, and admin sections using role-aware layout routes.
- Added reusable `customer`, `staff`, and `admin` layouts plus a `RouteGuard` component backed by `api.users.getMe`.
- Updated auth-facing frontend flows to use dedicated `/sign-in` and `/sign-up` routes, redirect handling, optional Google sign-in entry points, and the new app user menu.
- Kept email verification delivery deferred until the email infrastructure sprint; Google auth is now configuration-ready via environment variables.
