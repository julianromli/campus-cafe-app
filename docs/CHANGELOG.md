# Changelog

## 2026-04-17

### Phase 7 — Notifications & email (B-007, B-008, B-035, B-037, B-039)
- **Convex Resend component:** `packages/backend/convex/convex.config.ts` registers `@convex-dev/resend`; dependencies `@convex-dev/resend`, `resend`, and peer `convex-helpers` in `packages/backend/package.json`.
- **`packages/backend/convex/emails.ts`:** `Resend` client with `testMode` from `RESEND_TEST_MODE`; internal mutations `sendBookingConfirmation` and `sendCancellationNotice` (HTML templates, `SITE_URL` / `EMAIL_FROM_ADDRESS`, try/catch logging). Booking email runs from `payments.mayarWebhook` after successful reservation payment; cancellation email + admin alerts scheduled from `reservations.cancel` via `ctx.scheduler.runAfter(0, …)`.
- **`packages/backend/convex/notifications.ts`:** `listMine`, `countUnread`, `markRead`, `markAllRead`; internal `create` and `notifyAdminsOfCancellationRefund` (one row per admin for paid cancellations).
- **Web:** `apps/web/src/components/notifications/notification-bell.tsx` (popover, unread badge, “Tandai semua dibaca”, amber border for `cancellation_refund`); mounted in `apps/web/src/components/layouts/admin-layout.tsx`.
- **Docs:** `docs/BACKLOG.md` — B-035, B-037, B-039 marked Done; B-007/B-008 notes aligned with Resend component + bell UI; `docs/NOTES.md` — Resend-related Convex env vars.

### Phase 4 — Menu & In-seat ordering (B-024…B-030)
- **Convex (`packages/backend/convex/menu.ts`):** Public queries `listCategories`, `listPublicMenu`, `listItemsByCategory`; staff query `listAllItems` (joins category name); admin category mutations `createCategory`, `updateCategory`, `deleteCategory` (blocks on non-empty), `reorderCategories`; staff item mutations `createItem`, `updateItem`, `toggleAvailability`, `bulkToggleCategory`, `deleteItem`, plus `generateItemImageUploadUrl` for Convex storage uploads. `menuItems` now stores `imageStorageId`; all list queries resolve signed URLs on read.
- **Convex (`packages/backend/convex/orders.ts`):** Staff queries `listActive` (pending + preparing + ready, ordered by `createdAt`), `listCompletedToday` (uses client `referenceTimestamp`, UTC day bounds); customer queries `listByUser`, `listActiveForUserAtTable`, `getById` (owner or staff/admin); mutation `create` validates cart, resolves prices from DB, tags `orderType` `reserved` / `walkin` via active reservation lookup at the given table; mutation `updateStatus` enforces strict forward transitions (pending → preparing → ready → completed).
- **Web — customer QR landing (`apps/web/src/routes/_public.table.$tableId.tsx`):** Public, no auth wall to browse; loads `api.tables.getById` + `api.menu.listPublicMenu`, shows `TableOrderHeader`, opens `SignInPromptSheet` for unauthenticated add-to-cart, wires live active-order status inline via `api.orders.listActiveForUserAtTable`.
- **Web — customer menu + cart (`apps/web/src/components/menu/`):** `menu-view.tsx`, `item-card.tsx`, `cart-drawer.tsx`, `cart-context.tsx`, `sign-in-prompt-sheet.tsx`, `table-order-header.tsx`. Cart state is `tableId`-scoped via React context, cleared after successful `api.orders.create`, with sold-out items dimmed and quantity stepper in cards.
- **Web — customer my-orders (`apps/web/src/routes/_customer.my-orders.tsx`):** Active orders with live `OrderStatus` stepper, past orders section, and toast notifications on status transitions via status diffing in a ref.
- **Web — staff kitchen queue (`apps/web/src/routes/staff.orders.tsx`):** `OrderQueueBoard` with Pending / Preparing / Ready columns, "Move to next stage" buttons wired to `api.orders.updateStatus`, optional new-order audio toast, and a History tab backed by `listCompletedToday` with `referenceTimestamp`.
- **Web — menu management (`apps/web/src/routes/admin.menu.tsx` + `staff.menu.tsx`):** Shared `MenuManagement` component (mode = `"admin"` / `"staff"`) with category sidebar, item grid, per-item availability toggle, category-level bulk toggle, and `category-form-sheet.tsx` / `menu-item-form-sheet.tsx` drawers. `image-upload.tsx` uses `generateItemImageUploadUrl` + Convex storage.
- **Follow-up (not in this phase):** `analytics.todayOverview.activeOrders` and `analytics.thirtyDayTrends[].orderCount` still return `0` (hardcoded) — wiring those to the real `orders` table is the next analytics task.
- Updated `docs/BACKLOG.md` task statuses for B-024 through B-030.

### Implementation — Events Slice (listing + external link)
- **Convex (`packages/backend/convex/`):** Added `events.ts` with public queries `listPublishedActive`, `getById`, admin `listAllAdmin` / `getByIdAdmin`, and mutations `create`, `update`, `remove`, `publish`, `unpublish`. `events` table is listing-only: optional `externalUrl`, `organizerName`, `locationText`; publish enforces valid `https://` URLs. Removed `eventRegistrations` table and `event_ticket` payment type; `notificationMetadata` no longer references `eventRegistrationId`.
- **Analytics:** `todayOverview` now exposes `publishedEventsActive` (published events not past `endTime`) instead of `todayEventRegistrations`; `thirtyDayTrends` no longer includes per-day `eventRegistrations`.
- **Web (`apps/web/src/`):** Customer homepage + new `/events` index + `/events/:id` detail with outbound official CTA; `components/events/event-card.tsx`. Admin `/admin/events` CRUD + publish/unpublish; removed `admin.events.$id.attendees.tsx`. Header adds **Events** nav link.
- **One-time migration:** `events:migrateDatastoreForEventsSlice` was used during rollout to clear legacy registrations and normalize rows; removed from code after schema narrow — existing deployments upgrading from pre–Events Slice should run a data cleanup/migration before pushing if they still hold legacy tables.

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
