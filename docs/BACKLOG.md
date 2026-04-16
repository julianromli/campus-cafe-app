# Development Backlog
## Campus Cafe — AI Agent Execution Guide
**PRD Version:** 1.2 | **Last updated:** April 16, 2026

> **For AI Coding Agents:** Read this file top-to-bottom before starting. Each task is atomic and self-contained. Always check `depends_on` before starting a task — its dependencies must be `✅ Done` first. Work one task at a time. Mark a task `🔄 In Progress` when you start, `✅ Done` when complete.

---

## Quick Reference: All Tasks

| ID | Title | Epic | Status | Priority | Depends On |
|----|-------|------|--------|----------|------------|
| B-001 | Convex schema — all tables & indexes | Foundation | ⬜ Todo | P0 | — |
| B-002 | Role-based auth helpers (Convex) | Foundation | ⬜ Todo | P0 | B-001 |
| B-003 | Better-Auth: Google OAuth + email verification | Foundation | ⬜ Todo | P0 | — |
| B-004 | User profile — Convex queries & mutations | Foundation | ⬜ Todo | P0 | B-001, B-002 |
| B-005 | React Router route tree setup | Foundation | ⬜ Todo | P0 | — |
| B-006 | App shell layouts (customer, staff, admin) | Foundation | ⬜ Todo | P0 | B-005 |
| B-007 | In-app notifications system (Convex) | Foundation | ⬜ Todo | P1 | B-001, B-002 |
| B-008 | Resend email action setup | Foundation | ⬜ Todo | P1 | — |
| B-009 | Tables — Convex queries & mutations | Tables | ⬜ Todo | P0 | B-001, B-002 |
| B-010 | Admin: table layout editor UI | Tables | ⬜ Todo | P0 | B-009, B-006 |
| B-011 | Customer: interactive floor plan | Tables | ⬜ Todo | P0 | B-009, B-006 |
| B-012 | Reservations — Convex queries & mutations | Tables | ⬜ Todo | P0 | B-001, B-002, B-009 |
| B-013 | Mayar.id payment — actions & webhook handler | Tables | ⬜ Todo | P0 | B-001, B-012 |
| B-014 | Reservation form + booking flow UI | Tables | ⬜ Todo | P0 | B-012, B-013, B-011 |
| B-015 | My Reservations page (customer) | Tables | ⬜ Todo | P0 | B-012, B-006 |
| B-016 | Staff/Admin: live reservation operations board | Tables | ⬜ Todo | P0 | B-012, B-009, B-006 |
| B-017 | Events — Convex queries & mutations | Events | ⬜ Todo | P0 | B-001, B-002 |
| B-018 | Event Registrations — Convex queries & mutations | Events | ⬜ Todo | P0 | B-001, B-002, B-013 |
| B-019 | Homepage: event listing section | Events | ⬜ Todo | P0 | B-017, B-006 |
| B-020 | Event detail page | Events | ⬜ Todo | P0 | B-017, B-018, B-006 |
| B-021 | Post-registration: reserve table prompt | Events | ⬜ Todo | P1 | B-020, B-012 |
| B-022 | Admin: event creation & management | Events | ⬜ Todo | P0 | B-017, B-006 |
| B-023 | Admin: event attendees list + CSV export | Events | ⬜ Todo | P1 | B-018, B-022 |
| B-024 | Menu — Convex queries & mutations | Menu & Orders | ⬜ Todo | P0 | B-001, B-002 |
| B-025 | Admin/Staff: menu management UI | Menu & Orders | ⬜ Todo | P0 | B-024, B-006 |
| B-026 | QR code landing page (`/table/:tableId`) | Menu & Orders | ⬜ Todo | P0 | B-024, B-006 |
| B-027 | Customer: menu view + cart | Menu & Orders | ⬜ Todo | P0 | B-024, B-026 |
| B-028 | Orders — Convex queries & mutations | Menu & Orders | ⬜ Todo | P0 | B-001, B-002, B-012 |
| B-029 | Staff: live kitchen order queue | Menu & Orders | ⬜ Todo | P0 | B-028, B-006 |
| B-030 | Customer: order status tracking | Menu & Orders | ⬜ Todo | P0 | B-028, B-027 |
| B-031 | Analytics — Convex queries | Dashboard | ⬜ Todo | P1 | B-012, B-018, B-028 |
| B-032 | Admin: analytics dashboard UI | Dashboard | ⬜ Todo | P1 | B-031, B-006 |
| B-033 | Profile page (customer) | Users | ⬜ Todo | P1 | B-004, B-006 |
| B-034 | Admin: staff management (invite, role, revoke) | Users | ⬜ Todo | P1 | B-004, B-006, B-008 |
| B-035 | Email: booking confirmation | Notifications | ⬜ Todo | P1 | B-008, B-013 |
| B-036 | Email: event registration confirmation | Notifications | ⬜ Todo | P1 | B-008, B-018 |
| B-037 | Email: cancellation notice | Notifications | ⬜ Todo | P1 | B-008, B-012, B-018 |
| B-038 | Email: event reminder (24h before, scheduled) | Notifications | ⬜ Todo | P2 | B-008, B-017 |
| B-039 | Admin in-app notification: cancellation refund alert | Notifications | ⬜ Todo | P1 | B-007, B-012, B-018 |
| B-040 | Admin: manual payment sync button | Polish | ⬜ Todo | P2 | B-013 |
| B-041 | Skeleton loading states (all data views) | Polish | ⬜ Todo | P2 | B-011, B-019, B-029, B-032 |
| B-042 | PWA manifest + installable prompt | Polish | ⬜ Todo | P2 | — |
| B-043 | Mobile responsive audit (375px+) | Polish | ⬜ Todo | P2 | all UI tasks |

**Priority legend:** P0 = launch blocker · P1 = important · P2 = nice-to-have pre-launch

---

## Recommended Execution Order

Start tasks within each phase only after all P0 tasks in the previous phase are `✅ Done`.

```
Phase 1 (Foundation):   B-001 → B-002, B-003, B-005 → B-004, B-006, B-007, B-008
Phase 2 (Tables):       B-009 → B-010, B-011, B-012 → B-013 → B-014, B-015, B-016
Phase 3 (Events):       B-017, B-018 → B-019, B-020 → B-021, B-022 → B-023
Phase 4 (Menu/Orders):  B-024 → B-025, B-026 → B-027, B-028 → B-029, B-030
Phase 5 (Dashboard):    B-031 → B-032
Phase 6 (Users):        B-033, B-034
Phase 7 (Notif/Email):  B-035, B-036, B-037, B-038, B-039
Phase 8 (Polish):       B-040, B-041, B-042, B-043
```

---

## Tech Stack Reference

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | React + React Router v7 | `apps/web/src/` |
| UI Components | shadcn/ui + TailwindCSS | `packages/ui/src/` |
| Backend | Convex | `packages/backend/convex/` |
| Auth | Better-Auth + Convex | `packages/backend/convex/auth.ts` |
| Payments | Mayar.id | Convex Action + HTTP webhook |
| Email | Resend | Convex Action (`"use node"`) |
| Deployment | Cloudflare (Alchemy) | `apps/web/` |

**Monorepo import alias:** `@campus-cafe/ui` → shared UI components from `packages/ui`

---

---

## EPIC 0 — Foundation

> Must be completed before any feature work begins.

---

### B-001 · Convex Schema — All Tables & Indexes
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** —

**File to edit:** `packages/backend/convex/schema.ts`

Replace the existing minimal schema with the full application schema. Define every table exactly as specified below.

```ts
// packages/backend/convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("customer"), v.literal("staff"), v.literal("admin")),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_email", ["email"]),

  tables: defineTable({
    label: v.string(),
    zone: v.string(),
    capacity: v.number(),
    positionX: v.number(),
    positionY: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("booked"),
      v.literal("occupied"),
      v.literal("inactive")
    ),
    lastReleasedBy: v.optional(v.id("users")),
    lastReleasedAt: v.optional(v.number()),
  })
    .index("by_zone", ["zone"])
    .index("by_status", ["status"]),

  reservations: defineTable({
    tableId: v.id("tables"),
    userId: v.id("users"),
    guestCount: v.number(),
    startTime: v.number(),       // Unix ms
    durationHours: v.union(v.literal(1), v.literal(2), v.literal(3)),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    eventId: v.optional(v.id("events")),
    paymentRef: v.optional(v.string()),
    confirmationCode: v.optional(v.string()),
  })
    .index("by_tableId_startTime", ["tableId", "startTime"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    category: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    capacity: v.number(),
    seatsRemaining: v.number(),
    ticketPrice: v.number(),     // 0 = free
    status: v.union(v.literal("draft"), v.literal("published")),
    registrationDeadline: v.number(),
    createdBy: v.id("users"),
  }).index("by_status_startTime", ["status", "startTime"]),

  eventRegistrations: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    ticketCode: v.string(),
    paymentRef: v.optional(v.string()),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId", ["userId"]),

  menuCategories: defineTable({
    name: v.string(),
    displayOrder: v.number(),
  }),

  menuItems: defineTable({
    categoryId: v.id("menuCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    available: v.boolean(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_available", ["available"]),

  orders: defineTable({
    tableId: v.id("tables"),
    reservationId: v.optional(v.id("reservations")),
    userId: v.id("users"),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        qty: v.number(),
      })
    ),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed")
    ),
    orderType: v.union(v.literal("reserved"), v.literal("walkin")),
  })
    .index("by_tableId", ["tableId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  payments: defineTable({
    refId: v.string(),           // Mayar.id transactionId
    type: v.union(
      v.literal("reservation"),
      v.literal("event_ticket")
    ),
    targetId: v.string(),        // reservationId or eventRegistrationId
    amount: v.number(),
    currency: v.literal("IDR"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded")
    ),
  })
    .index("by_refId", ["refId"])
    .index("by_targetId", ["targetId"]),

  notifications: defineTable({
    targetUserId: v.id("users"),
    type: v.string(),            // e.g. "cancellation_refund", "event_reminder"
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_targetUserId_read", ["targetUserId", "read"]),
});
```

**Done when:** `npx convex dev` runs without schema errors.

---

### B-002 · Role-Based Auth Helpers (Convex)
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001

**File to create:** `packages/backend/convex/lib/auth.ts`

Create helper functions used by every protected query/mutation. These enforce role checks at the Convex layer — never trust client-supplied roles.

```ts
// packages/backend/convex/lib/auth.ts
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .unique();
}

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  if (!user) throw new Error("Unauthenticated");
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: "staff" | "admin"
) {
  const user = await requireAuth(ctx);
  const allowed =
    role === "staff"
      ? user.role === "staff" || user.role === "admin"
      : user.role === "admin";
  if (!allowed) throw new Error("Unauthorized");
  return user;
}
```

**Done when:** File exists and TypeScript compiles without errors.

---

### B-003 · Better-Auth: Google OAuth + Email Verification
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** —

**Files to edit:**
- `packages/backend/convex/auth.config.ts` — add Google provider
- `packages/backend/convex/auth.ts` — ensure user upsert creates record in `users` table with `role: "customer"` as default
- `apps/web/src/lib/auth-client.ts` — create auth client with `socialProviders: { google: {} }`
- `apps/web/.env` — add `VITE_GOOGLE_CLIENT_ID`

**Requirements:**
- On first login (either email or Google), a record must be created in the `users` table with `role: "customer"`.
- Email verification must be enabled for email/password registrations.
- After Google OAuth success, redirect to `/` (homepage).
- After email/password registration, redirect to email verification notice page.

**Done when:** User can register with email, verify, and log in. User can also log in with Google. The `users` table row is created in Convex for both paths.

---

### B-004 · User Profile — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002

**File to create:** `packages/backend/convex/users.ts`

```ts
// Queries needed:
// - getMe: returns current authenticated user's full record
// - getById(id): admin only — fetch any user

// Mutations needed:
// - updateProfile({ name, phone, avatarUrl }): authenticated user updates own profile
// - setRole({ userId, role }): admin only — change a user's role
// - revokeAccess({ userId }): admin only — sets role to "customer", effectively removing staff access
```

**Done when:** `api.users.getMe` works in the frontend and returns the correct user object.

---

### B-005 · React Router Route Tree Setup
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** —

**File to edit:** `apps/web/src/routes.ts`

Define the complete route tree. Create placeholder route files (they can be empty shells — just `export default function Page() { return null }`) for every route listed below.

```
Public routes:
  /                           → routes/_index.tsx          (homepage + events)
  /sign-in                    → routes/sign-in.tsx
  /sign-up                    → routes/sign-up.tsx
  /events/:id                 → routes/events.$id.tsx
  /table/:tableId             → routes/table.$tableId.tsx  (QR landing)

Customer routes (requires login):
  /reserve                    → routes/reserve.tsx         (floor plan)
  /my-reservations            → routes/my-reservations.tsx
  /my-orders                  → routes/my-orders.tsx
  /profile                    → routes/profile.tsx

Staff routes (requires role: staff|admin):
  /staff/reservations         → routes/staff/reservations.tsx
  /staff/orders               → routes/staff/orders.tsx
  /staff/menu                 → routes/staff/menu.tsx

Admin routes (requires role: admin):
  /admin/dashboard            → routes/admin/dashboard.tsx
  /admin/tables               → routes/admin/tables.tsx
  /admin/events               → routes/admin/events.tsx
  /admin/events/:id/attendees → routes/admin/events.$id.attendees.tsx
  /admin/menu                 → routes/admin/menu.tsx
  /admin/staff                → routes/admin/staff.tsx
  /admin/payments             → routes/admin/payments.tsx
```

**Done when:** All routes exist as files, app starts, and navigating to each URL doesn't crash.

---

### B-006 · App Shell Layouts
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-005

**Files to create:**
- `apps/web/src/components/layouts/customer-layout.tsx` — top navbar with: logo, "Events" link, "Reserve a Table" CTA, user menu (My Reservations, My Orders, Profile, Sign out). Shows sign-in button when logged out.
- `apps/web/src/components/layouts/staff-layout.tsx` — left sidebar with: logo, links to Reservations, Orders, Menu. User info at bottom.
- `apps/web/src/components/layouts/admin-layout.tsx` — left sidebar with: logo, links to Dashboard, Tables, Events, Menu, Staff, Payments. Notification bell in header. User info at bottom.

**Route protection:** Wrap staff/admin routes with a role guard that redirects to `/sign-in` if unauthenticated, or to `/` if role is insufficient. Create `apps/web/src/components/layouts/route-guard.tsx` for this.

**Done when:** Navigating to `/staff/orders` as an unauthenticated user redirects to `/sign-in`. Navigating as a customer redirects to `/`.

---

### B-007 · In-App Notifications System (Convex)
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-001, B-002

**File to create:** `packages/backend/convex/notifications.ts`

```ts
// Queries:
// - listMine: returns all notifications for current user, sorted by _creationTime desc
// - countUnread: returns count of unread notifications for current user

// Mutations:
// - markRead({ notificationId }): mark single notification as read
// - markAllRead: mark all of current user's notifications as read

// Internal mutation (called by other backend functions, NOT from client):
// - create({ targetUserId, type, title, message, metadata? })
```

**Notification bell component:**
- Create `apps/web/src/components/notifications/notification-bell.tsx`
- Badge showing unread count (via `useQuery(api.notifications.countUnread)`)
- Dropdown list of recent notifications on click
- "Mark all read" button

**Done when:** Creating a notification via `internal.notifications.create` in the Convex dashboard appears in the bell for the target user within 2 seconds.

---

### B-008 · Resend Email Action Setup
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** —

**File to create:** `packages/backend/convex/emails.ts`

This file must begin with `"use node";` because it uses the Resend Node.js SDK.

```ts
"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
// Import: import { Resend } from "resend";

// Internal action: sendEmail({ to, subject, htmlBody })
// Uses RESEND_API_KEY from Convex environment variables.
// Log success/failure but do not throw — email failure should never crash the main flow.
```

**Environment variable:** Add `RESEND_API_KEY` to Convex env (`npx convex env set RESEND_API_KEY ...`).

**Done when:** Calling the internal action with a test email address delivers an email.

---

---

## EPIC 1 — Table Reservation System

---

### B-009 · Tables — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002

**File to create:** `packages/backend/convex/tables.ts`

```ts
// Queries:
// - list: returns all non-inactive tables (public, reactive — used by customer floor map)
// - listAll: returns all tables including inactive (admin only)
// - getById(id): returns single table

// Mutations:
// - create({ label, zone, capacity, positionX, positionY }): admin only
// - update({ id, label?, zone?, capacity?, positionX?, positionY? }): admin only
// - setStatus({ id, status }): admin only — for toggling inactive/active
// - markOccupied({ id }): staff/admin — booked → occupied
// - release({ id }): staff/admin — any status → available
//   On release: set status="available", lastReleasedBy=currentUserId, lastReleasedAt=Date.now()
// - delete({ id }): admin only — only if no confirmed reservations exist for this table
```

**Validation:** Capacity must be between 1 and 20. `positionX` and `positionY` must be >= 0.

**Done when:** `api.tables.list` returns an array. Create/update/release mutations work with proper role checks.

---

### B-010 · Admin: Table Layout Editor UI
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-009, B-006

**File to edit:** `apps/web/src/routes/admin/tables.tsx`

**Layout:** Split view — left panel is a table list, right panel is the visual floor plan editor.

**Floor plan editor:**
- An SVG canvas (e.g., 800×600) representing the cafe floor.
- Each table is a draggable rectangle/circle labeled with `label` and capacity.
- Drag a table to update `positionX`/`positionY` (call `api.tables.update` on drag end).
- Color by status: green=available, red=booked/occupied, gray=inactive.

**Table list panel:**
- Each row: label, zone, capacity, status badge, Edit button, Toggle Active/Inactive button, Delete button.
- "Add Table" button opens a drawer with a form: label, zone, capacity, positionX, positionY inputs.

**Done when:** Admin can add a table, see it appear on the SVG canvas, drag it to a new position, and toggle it inactive.

---

### B-011 · Customer: Interactive Floor Plan
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-009, B-006

**File to edit:** `apps/web/src/routes/reserve.tsx`

**Component to create:** `apps/web/src/components/reserve/floor-plan.tsx`

**Requirements:**
- Render all `available` and `booked/occupied` tables from `useQuery(api.tables.list)`.
- SVG canvas matches the proportions used in the admin editor.
- Color coding: Green = Available (clickable), Red = Booked/Occupied (not clickable, shows "Unavailable" tooltip), Gray = Inactive (hidden).
- Clicking an Available table opens a `ReservationFormSheet` (slide-over from the right) pre-filled with that table's info.
- Floor plan is responsive: on mobile, it scrolls horizontally and tables are slightly larger tap targets.
- Real-time: if another user books a table while this screen is open, it turns red instantly (Convex reactive).

**Done when:** Customer can see the floor plan, green tables are clickable, red tables show tooltip, and the status updates live.

---

### B-012 · Reservations — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002, B-009

**File to create:** `packages/backend/convex/reservations.ts`

```ts
// Queries:
// - listByUser: returns current user's reservations, newest first
// - listAll: staff/admin only — all reservations, optionally filtered by date
// - getById(id): returns single reservation with table info joined
// - checkAvailability({ tableId, startTime, durationHours }):
//     returns true if no confirmed reservation overlaps this window for that table

// Mutations:
// - create({ tableId, guestCount, startTime, durationHours, eventId? }):
//     1. requireAuth
//     2. Check guestCount <= table.capacity
//     3. Call checkAvailability — throw if already booked
//     4. Generate confirmationCode (nanoid, 8 chars uppercase)
//     5. Insert reservation with status="pending"
//     6. Return { reservationId, confirmationCode }
//
// - confirm({ reservationId, paymentRef }):
//     INTERNAL — called only by webhook handler
//     Sets status="confirmed", sets table.status="booked", stores paymentRef
//     Must be atomic: check reservation is still "pending" before confirming
//
// - cancel({ reservationId }):
//     requireAuth — user must own this reservation OR be staff/admin
//     Check: startTime - now > 2 hours (configurable), else throw "Cancellation window passed"
//     Set status="cancelled"
//     NOTE: does NOT change table.status (staff must release manually)
//     Schedule: notify admin via internal.notifications.create
```

**Done when:** `create` returns a reservationId, `checkAvailability` correctly detects overlaps, `cancel` enforces the 2-hour cutoff.

---

### B-013 · Mayar.id Payment — Actions & Webhook Handler
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-012

**Files to create/edit:**

**`packages/backend/convex/payments.ts`** (action file — `"use node"` required for fetch):
```ts
"use node";
// Actions (called from frontend):
// - createReservationPaymentLink({ reservationId }):
//     1. requireAuth
//     2. Fetch reservation, verify it belongs to current user and is "pending"
//     3. POST to https://api.mayar.id/hl/v1/payment-link/create with:
//        { name, amount, customerName, customerEmail, redirectUrl, metadata: { reservationId } }
//     4. Insert payments record with status="pending"
//     5. Return { paymentUrl }
//
// - createEventPaymentLink({ eventRegistrationId }):
//     Same pattern for event ticket payments
```

**`packages/backend/convex/http.ts`** (edit existing):
```ts
// Add HTTP route: POST /mayar/webhook
// Handler:
//   1. Read body as JSON
//   2. Verify Mayar.id signature header (HMAC or token — check Mayar.id docs)
//   3. If event !== "payment.received" or status !== "SUCCESS": return 200 immediately (no-op)
//   4. Extract transactionId and metadata.reservationId or metadata.eventRegistrationId
//   5. Check payments table by refId — if already "paid", return 200 (idempotency)
//   6. Call internal mutation to confirm the booking:
//      - For reservation: internal.reservations.confirm({ reservationId, paymentRef: transactionId })
//      - For event: internal.eventRegistrations.confirm({ eventRegistrationId, paymentRef: transactionId })
//   7. Update payments record status to "paid"
//   8. Schedule email confirmation (internal.emails.sendBookingConfirmation or sendEventConfirmation)
//   9. Return 200
```

**Environment variables needed:**
- `MAYAR_API_KEY` — Mayar.id API key
- `MAYAR_WEBHOOK_SECRET` — for signature verification

**Done when:** A simulated webhook POST to `/mayar/webhook` with a valid payload correctly changes a pending reservation to confirmed and the table to booked.

---

### B-014 · Reservation Form + Booking Flow UI
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-012, B-013, B-011

**File to create:** `apps/web/src/components/reserve/reservation-form-sheet.tsx`

This is a slide-over panel (shadcn `Sheet`) that opens when customer clicks a table on the floor plan.

**Form fields:**
1. **Table info header** — table label, zone, capacity (read-only)
2. **Date** — date picker (today → +7 days)
3. **Start time** — hour selector (e.g. 10:00, 11:00, ... 21:00 based on cafe hours)
4. **Duration** — segmented control: `1 hour` / `2 hours` / `3 hours`
5. **Guest count** — number input (1 → table capacity)
6. **Refund policy notice** — small text: "Pembatalan dapat dilakukan minimal 2 jam sebelum jadwal. Refund diproses manual dalam 1–3 hari kerja."

**On submit:**
1. Call `api.reservations.create` — show error if availability conflict
2. On success: call `api.payments.createReservationPaymentLink`
3. Redirect to Mayar.id `paymentUrl` in same tab (`window.location.href = paymentUrl`)
4. On return from Mayar.id (redirect URL `/my-reservations?success=true`): show success toast

**Loading state:** Disable form and show spinner while creating payment link.

**Done when:** Full flow works end-to-end from clicking a table to being redirected to Mayar.id.

---

### B-015 · My Reservations Page (Customer)
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-012, B-006

**File to edit:** `apps/web/src/routes/my-reservations.tsx`

**Layout:** Two tabs — "Upcoming" and "Past"

**Each reservation card shows:**
- Table label + zone
- Date, start time, duration, guest count
- Status badge (Pending / Confirmed / Cancelled)
- Confirmation code (for confirmed reservations)
- Linked event name (if applicable)

**Cancel button:**
- Visible only on confirmed upcoming reservations
- Opens a confirmation dialog: "Apakah kamu yakin ingin membatalkan? Refund akan diproses dalam 1–3 hari kerja."
- On confirm: call `api.reservations.cancel`
- On error (past cutoff): show toast "Pembatalan tidak dapat dilakukan kurang dari 2 jam sebelum jadwal."

**Done when:** Reservations list renders, cancellation dialog works, error state shows correctly.

---

### B-016 · Staff/Admin: Live Reservation Operations Board
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-012, B-009, B-006

**File to edit:** `apps/web/src/routes/staff/reservations.tsx`

**Two views (tab toggle):**

**1. Floor Plan View (live status board):**
- Same SVG floor plan as customers see, but with all statuses visible including occupied
- Each table has quick-action buttons directly on hover/click:
  - `booked` table → "Mark Occupied" button
  - `booked` or `occupied` table → "Release Table" button (with confirmation)
- Clicking a table shows booking detail panel: customer name, guest count, duration, event link

**2. Reservation List View:**
- Table of all today's and upcoming reservations
- Columns: Table, Customer, Date/Time, Duration, Guests, Status, Actions
- Filter by date, table, status

**Done when:** Staff can see live table statuses, mark a table occupied, and release it back to available.

---

---

## EPIC 2 — Events

---

### B-017 · Events — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002

**File to create:** `packages/backend/convex/events.ts`

```ts
// Queries:
// - listPublished: published events where startTime > now, sorted by startTime asc (public)
// - listAll: all events (admin only)
// - getById(id): single event — public for published, any for admin
// - listPast: published events where startTime < now (archive)

// Mutations:
// - create({ title, description, coverImage?, category, startTime, endTime,
//             capacity, ticketPrice, registrationDeadline }): admin only
//     Sets seatsRemaining = capacity, status = "draft"
//
// - update({ id, ...fields }): admin only
//
// - publish({ id }): admin only — draft → published
// - unpublish({ id }): admin only — published → draft
//
// - delete({ id }): admin only
//     If published and has confirmed registrations: throw with message
//     "Event ini memiliki peserta terdaftar. Batalkan semua registrasi sebelum menghapus."
//
// Internal mutation:
// - decrementSeats({ id }): atomically decrement seatsRemaining by 1
//     Throw if seatsRemaining <= 0
```

**Done when:** `api.events.listPublished` returns upcoming published events.

---

### B-018 · Event Registrations — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002, B-013

**File to create:** `packages/backend/convex/eventRegistrations.ts`

```ts
// Queries:
// - listByUser: current user's registrations with event details joined
// - listByEvent({ eventId }): admin only — all registrations for an event

// Mutations:
// - registerFree({ eventId }):
//     requireAuth
//     Check event is published, deadline not passed, seatsRemaining > 0
//     Check user hasn't already registered for this event
//     Atomically: call internal.events.decrementSeats, insert registration with status="confirmed"
//     Generate ticketCode (nanoid 10 chars uppercase)
//     Schedule: send confirmation email
//     Return { eventRegistrationId, ticketCode }
//
// - registerPaid({ eventId }):
//     requireAuth
//     Same checks as registerFree
//     Insert registration with status="pending" (not yet confirmed)
//     Call payments.createEventPaymentLink (from client after getting registrationId)
//     Seat is NOT decremented yet — only on webhook confirm
//
// - confirm({ eventRegistrationId, paymentRef }):
//     INTERNAL — called by webhook handler only
//     Atomically: decrement seats, set status="confirmed", set paymentRef
//
// - cancel({ eventRegistrationId }): requireAuth (owner or admin)
//     Set status="cancelled"
//     Increment seatsRemaining back by 1 (internal mutation)
//     Schedule: notify admin (internal.notifications.create) if had payment
```

**Done when:** Free event registration flow works end-to-end; paid registration creates a pending record.

---

### B-019 · Homepage: Event Listing Section
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-017, B-006

**File to edit:** `apps/web/src/routes/_index.tsx`

Replace the existing placeholder homepage with a real layout.

**Homepage sections:**
1. **Hero section** — cafe name, tagline, two CTAs: "Lihat Event" (scroll) + "Reservasi Meja" (link to `/reserve`)
2. **Upcoming Events grid** — `useQuery(api.events.listPublished)`, max 6 cards, "Lihat Semua" link
3. **About / Location section** (static content — address, hours)

**Event card component** (`apps/web/src/components/events/event-card.tsx`):
- Cover image (full bleed top)
- Category badge (top-left overlay)
- Title, date/time
- Seats remaining counter with urgency color (red when < 10% remaining)
- "Full" overlay banner when seatsRemaining = 0
- Links to `/events/:id`

**Done when:** Homepage renders a list of published events and cards link to detail pages.

---

### B-020 · Event Detail Page
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-017, B-018, B-006

**File to edit:** `apps/web/src/routes/events.$id.tsx`

**Layout:**
- Large cover image header
- Title, category badge, date/time range, organizer name
- Description (rendered as rich text / markdown)
- Right-side sticky card (on desktop): seats remaining (reactive), price, register CTA

**Registration CTA logic:**
- `seatsRemaining === 0` → button disabled, shows "Event Penuh"
- `ticketPrice === 0` → button text "Daftar Gratis" → calls `api.eventRegistrations.registerFree`
- `ticketPrice > 0` → button text "Beli Tiket – Rp{price}" → calls `api.eventRegistrations.registerPaid` then `api.payments.createEventPaymentLink`, then redirects to Mayar.id
- User already registered → button shows "Sudah Terdaftar ✓" (check via `listByUser`)
- Not logged in → button redirects to `/sign-in?redirect=/events/:id`

**After successful free registration:**
- Show inline success state with ticket code
- Render `PostRegistrationPrompt` component (see B-021)

**Done when:** Free registration works; paid registration redirects to Mayar.id; seat count decrements live.

---

### B-021 · Post-Registration: Reserve Table Prompt
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-020, B-012

**File to create:** `apps/web/src/components/events/post-registration-prompt.tsx`

A dismissible banner/card that appears after successful event registration:

> **"Mau duduk bareng? Reservasi meja untuk malam ini!"**  
> [Reservasi Meja →]

Clicking the button navigates to `/reserve?date=YYYY-MM-DD&eventId=xxx` where the date is pre-filled from the event's startTime.

In the reservation form (`B-014`), detect the `eventId` query param and pre-fill the date field. The resulting reservation will have `eventId` set.

**Done when:** After event registration, prompt appears and clicking it opens the reservation form with date pre-filled.

---

### B-022 · Admin: Event Creation & Management
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-017, B-006

**File to edit:** `apps/web/src/routes/admin/events.tsx`

**Page layout:**
- Top: "New Event" button
- Table of all events (draft + published): cover thumbnail, title, category, date, capacity, registrations count, status badge, Edit/Publish/Delete actions

**Create/Edit form** (in a full-page drawer or dedicated route):
- Title, Category (dropdown: Nobar / Workshop / Meetup / Other)
- Description — rich text editor (use `@tiptap/react` or similar)
- Cover image — file upload (store URL to Convex storage)
- Start date/time, End date/time
- Capacity (number), Ticket price (0 = free)
- Registration deadline (date/time)

**Delete guard:** If event has confirmed registrations, show warning dialog listing count of registrants. Confirm text must be typed exactly ("HAPUS") before delete is allowed.

**Done when:** Admin can create a draft event, publish it, and it appears on the homepage.

---

### B-023 · Admin: Event Attendees List + CSV Export
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-018, B-022

**File to edit:** `apps/web/src/routes/admin/events.$id.attendees.tsx`

**Layout:**
- Event summary header (name, date, total registrations / capacity)
- Table: Name, Email, Ticket Code, Registration Date, Payment Status, Status (Confirmed/Cancelled)
- Search/filter by name or email
- "Export CSV" button — generates and downloads a CSV of the current filtered list
- "Send Reminder" button — calls a mutation that schedules in-app notifications + emails to all confirmed registrants

**Done when:** Attendees list renders, CSV downloads correctly, reminder button creates notifications for all attendees.

---

---

## EPIC 3 — Menu & In-Seat Ordering

---

### B-024 · Menu — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002

**File to create:** `packages/backend/convex/menu.ts`

```ts
// Queries:
// - listCategories: all categories sorted by displayOrder (public)
// - listItemsByCategory({ categoryId }): items for a category (public)
// - listAllItems: all items with category info joined (staff/admin)

// Category mutations (admin only):
// - createCategory({ name })
// - updateCategory({ id, name, displayOrder })
// - deleteCategory({ id }): throws if category has items
// - reorderCategories({ orderedIds }): updates displayOrder for each id

// Item mutations (staff/admin):
// - createItem({ categoryId, name, description?, price, imageUrl? })
// - updateItem({ id, ...fields })
// - toggleAvailability({ id }): flips available boolean
// - bulkToggleCategory({ categoryId, available }): sets all items in category to given availability
// - deleteItem({ id })
```

**Done when:** `api.menu.listCategories` returns categories; toggling an item's availability is reflected within 2 seconds on all clients.

---

### B-025 · Admin/Staff: Menu Management UI
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-024, B-006

**File to edit:** `apps/web/src/routes/admin/menu.tsx` (also `staff/menu.tsx`)

**Layout:**
- Left sidebar: category list with drag-to-reorder handles, "Add Category" button at bottom
- Right panel: items grid for the selected category

**Each item card shows:**
- Photo thumbnail, name, price, availability toggle switch
- Edit and Delete icon buttons

**Availability toggle:**
- Individual toggle per item (calls `api.menu.toggleAvailability`)
- Category-level "Mark all Sold Out" / "Mark all Available" buttons

**Add/Edit item drawer:**
- Name, description, price, category selector, image upload
- Availability toggle

**Done when:** Staff can add a menu item, toggle availability, and the change is immediately visible on the customer menu page (if that page is open in another tab).

---

### B-026 · QR Code Landing Page (`/table/:tableId`)
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-024, B-006

**File to edit:** `apps/web/src/routes/table.$tableId.tsx`

**Requirements:**
- This page must load fast — no redirects, no auth walls before menu content is visible.
- Fetch `tableId` from URL params, validate it's a real active table (query Convex).
- Show menu immediately (categories + items) even for unauthenticated users.
- Show a `TableOrderHeader` at the top: "Meja {label} — {zone}" with table info.

**Auth check for ordering:**
- If user is not logged in and tries to add to cart or click "Order": show a bottom-sheet (`Sheet` from shadcn) with sign-in / sign-up options. After auth, return to the same URL.
- If user is logged in: check `api.reservations.checkActiveForTable({ tableId })` — a new query that returns the current user's active confirmed reservation for this table if one exists.

**Active reservation detection query (add to `reservations.ts`):**
```ts
// checkActiveForTable({ tableId }):
//   Returns the confirmed reservation for current user at this table
//   where startTime <= now <= startTime + durationHours*3600000
//   Returns null if none found
```

**Done when:** Scanning a QR (navigating to `/table/xxx`) shows the menu without any auth requirement.

---

### B-027 · Customer: Menu View + Cart
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-024, B-026

**Components to create:**

**`apps/web/src/components/menu/menu-view.tsx`:**
- Category tabs (horizontal scrollable on mobile)
- Item grid (2-column on mobile, 3-column on desktop)
- Sold-out items visually dimmed with "Habis" badge

**`apps/web/src/components/menu/item-card.tsx`:**
- Photo, name, description (truncated), price
- "+ Add" button (disabled if sold out)
- Quantity stepper if already in cart

**`apps/web/src/components/menu/cart-drawer.tsx`:**
- Floating cart button (bottom-right) showing item count badge
- Opens a bottom sheet on mobile / right-side drawer on desktop
- Lists cart items with quantity controls and line totals
- Order total
- "Pesan Sekarang" CTA button → calls `api.orders.create`
- Disabled if cart is empty

**Cart state:** Manage with React `useState` or Zustand. Cart is tied to the session and `tableId`; cleared after order is placed.

**Done when:** Customer can add items, adjust quantities, and see the correct total in the cart.

---

### B-028 · Orders — Convex Queries & Mutations
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-001, B-002, B-012

**File to create:** `packages/backend/convex/orders.ts`

```ts
// Queries:
// - listActive: staff/admin — all pending + preparing orders, reactive
// - listByUser: current user's orders sorted by _creationTime desc
// - listByTable({ tableId }): staff/admin — all orders for a table today
// - getById(id)

// Mutations:
// - create({ tableId, items: [{ menuItemId, qty }] }):
//     requireAuth
//     Validate tableId is active
//     Validate all menuItemIds exist and are available
//     Calculate total from DB prices (never trust client-sent prices)
//     Check for active reservation: call checkActiveForTable
//       → set orderType="reserved" and reservationId if found
//       → set orderType="walkin" if not found
//     Insert order with status="pending"
//     Return { orderId }
//
// - updateStatus({ orderId, status }):
//     requireRole "staff"
//     Validate status transition is valid (pending→preparing, preparing→ready, ready→completed)
//     Update status
```

**Done when:** `api.orders.create` inserts a new order; `listActive` returns it immediately (reactive).

---

### B-029 · Staff: Live Kitchen Order Queue
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-028, B-006

**File to edit:** `apps/web/src/routes/staff/orders.tsx`

**Layout:**
- Three columns (Kanban-style): **Pending** | **Preparing** | **Ready**
- Each order card: order number (last 6 chars of ID), table label, items list with quantities, time placed, "Move to Next Stage" button
- New order arrives → card animates in at the top of Pending column
- Audio notification option (toggle) for new pending orders

**Tabs at top:**
- "Live Queue" (pending + preparing + ready)
- "History" (completed orders today)

**Done when:** Placing an order from the customer menu causes a card to appear in the Pending column in real time without refreshing.

---

### B-030 · Customer: Order Status Tracking
**Status:** ⬜ Todo | **Priority:** P0 | **Depends on:** B-028, B-027

**File to edit:** `apps/web/src/routes/my-orders.tsx`

**Also add to:** `/table/:tableId` page — after placing an order, show the active order status inline on the table page.

**Status stepper component** (`apps/web/src/components/orders/order-status.tsx`):
- Horizontal stepper: Pending → Preparing → Ready
- Active step highlighted with animation
- Updates in real time via `useQuery(api.orders.getById, { id })`

**My Orders page:**
- Active orders at top (with live status)
- Past orders below (collapsed list)

**Done when:** Placing an order and having staff update its status is reflected on the customer's screen within 2 seconds.

---

---

## EPIC 4 — Admin Analytics Dashboard

---

### B-031 · Analytics — Convex Queries
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-012, B-018, B-028

**File to create:** `packages/backend/convex/analytics.ts`

```ts
// All queries: requireRole "admin"

// todayOverview:
//   - todayReservations: count of confirmed reservations with startTime on today's date
//   - occupiedTables: count of tables with status "booked" or "occupied"
//   - totalTables: count of non-inactive tables
//   - activeOrders: count of orders with status "pending" or "preparing"
//   - todayRevenue: sum of amount from payments where status="paid" and _creationTime >= today midnight

// thirtyDayTrends:
//   Returns an array of 30 objects { date: "YYYY-MM-DD", reservations, eventRegistrations, orderCount }
//   NOTE: do NOT use Date.now() directly in this query — accept a `referenceTimestamp` argument
//   from the client instead, to comply with Convex query caching rules
```

**Done when:** `api.analytics.todayOverview` returns correct counts.

---

### B-032 · Admin: Analytics Dashboard UI
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-031, B-006

**File to edit:** `apps/web/src/routes/admin/dashboard.tsx`

**Layout:**
- Top row: 4 stat cards — Reservasi Hari Ini, Meja Terisi, Pesanan Aktif, Pendapatan Hari Ini
- Middle: Line chart — 30-day reservations trend (use `recharts` via shadcn/ui chart component)
- Bottom: Two smaller charts side by side — event registrations trend + food order trend

**Stat cards:**
- Each card: icon, label, value, optional change indicator vs. yesterday
- All values from `useQuery(api.analytics.todayOverview)`

**Done when:** Dashboard renders with live data; stat cards update when new reservations/orders come in.

---

---

## EPIC 5 — User Management

---

### B-033 · Profile Page (Customer)
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-004, B-006

**File to edit:** `apps/web/src/routes/profile.tsx`

**Sections:**
1. **Profile info** — avatar (upload), display name, email (read-only), phone number. Save button calls `api.users.updateProfile`.
2. **Recent activity** — last 3 reservations + last 3 event registrations as compact list items with links.

**Done when:** User can update their name and phone number; changes persist on page refresh.

---

### B-034 · Admin: Staff Management
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-004, B-006, B-008

**File to edit:** `apps/web/src/routes/admin/staff.tsx`

**Staff table columns:** Name, Email, Role badge, Status (Active/Revoked), Actions

**Actions per row:**
- "Change Role" dropdown (Staff ↔ Admin) — calls `api.users.setRole`
- "Revoke Access" button — calls `api.users.revokeAccess`; shows confirmation dialog

**Invite Staff section:**
- Email input + "Kirim Undangan" button
- Calls an action that: creates a pending invite record + sends an invite email via Resend with a sign-up link that pre-assigns `role: "staff"` on account creation
- Implementation note: use Better-Auth's invite flow if available, otherwise implement a simple token-based invite

**Done when:** Admin can see all staff, revoke access, and send an invite email.

---

---

## EPIC 6 — Email Notifications

---

### B-035 · Email: Booking Confirmation
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-008, B-013

**Trigger:** Called from the Mayar.id webhook handler (`http.ts`) after `reservations.confirm` succeeds.

**Add internal action to `emails.ts`:** `sendBookingConfirmation({ reservationId })`
- Fetch reservation + table + user data
- Send via Resend to user's email
- Subject: "Reservasi Meja Dikonfirmasi — Campus Cafe"
- Content: table name, zone, date, start time, duration, guest count, confirmation code, refund policy reminder

---

### B-036 · Email: Event Registration Confirmation
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-008, B-018

**Trigger:** Called from `eventRegistrations.confirm` (webhook path) or `eventRegistrations.registerFree`.

**Add internal action:** `sendEventConfirmation({ eventRegistrationId })`
- Subject: "Tiket Kamu untuk {event name} — Campus Cafe"
- Content: event name, date/time, location, ticket code, QR code image of ticket code

---

### B-037 · Email: Cancellation Notice
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-008, B-012, B-018

**Trigger:** Called from `reservations.cancel` and `eventRegistrations.cancel`.

**Add internal action:** `sendCancellationNotice({ type: "reservation"|"event", targetId })`
- Subject: "Pembatalan Dikonfirmasi — Campus Cafe"
- Content: what was cancelled, refund message ("Refund akan diproses dalam 1–3 hari kerja melalui metode pembayaran asal")

---

### B-038 · Email: Event Reminder (24h Before, Scheduled)
**Status:** ⬜ Todo | **Priority:** P2 | **Depends on:** B-008, B-017

**Implementation:**
- When an event is published (`events.publish`), schedule a Convex `ctx.scheduler.runAt` job for `event.startTime - 24*60*60*1000`.
- The scheduled internal action: `sendEventReminders({ eventId })`
  - Fetch all confirmed registrations for the event
  - Send reminder email to each via Resend (can batch)
  - Subject: "Besok: {event name} di Campus Cafe 🎉"

**Note:** Only schedule once; if event is unpublished and re-published, cancel the previous scheduled job and create a new one.

---

### B-039 · Admin In-App Notification: Cancellation Refund Alert
**Status:** ⬜ Todo | **Priority:** P1 | **Depends on:** B-007, B-012, B-018

**Trigger:** Called from `reservations.cancel` and `eventRegistrations.cancel` when the cancelled booking had a payment (`paymentRef` is set).

**Implementation in `reservations.cancel` / `eventRegistrations.cancel`:**
```ts
// After setting status to "cancelled":
// 1. Find all users with role = "admin"
// 2. For each admin, call internal.notifications.create({
//      targetUserId: admin._id,
//      type: "cancellation_refund",
//      title: "Pembatalan — Perlu Refund Manual",
//      message: `${customerName} membatalkan reservasi Meja ${tableLabel} (${date} ${time}). 
//                Jumlah: Rp${amount.toLocaleString("id-ID")}. Proses refund di dashboard Mayar.id.`,
//      metadata: { reservationId, paymentRef, amount }
//    })
```

**Done when:** Cancelling a paid reservation causes the notification bell to show a new notification for admin within 2 seconds.

---

---

## EPIC 7 — Polish & Deployment

---

### B-040 · Admin: Manual Payment Sync Button
**Status:** ⬜ Todo | **Priority:** P2 | **Depends on:** B-013

**File to edit:** `apps/web/src/routes/admin/payments.tsx`

List of all payments with their status. For payments with `status: "pending"`, show a "Sync Status" button that:
1. Calls a Convex Action that queries the Mayar.id API for the current status of that `refId`
2. If the API returns `SUCCESS`, calls `internal.reservations.confirm` or `internal.eventRegistrations.confirm`
3. Shows the updated status inline

This is the fallback for when the webhook fails to deliver.

---

### B-041 · Skeleton Loading States
**Status:** ⬜ Todo | **Priority:** P2 | **Depends on:** B-011, B-019, B-029, B-032

Add `Skeleton` components (from shadcn/ui) to every page that fetches async data. Pages to cover:
- Floor plan (show placeholder table shapes while loading)
- Event listing (show 6 skeleton cards)
- Event detail (show image + text skeletons)
- Kitchen order queue (show 3 placeholder cards per column)
- Admin dashboard (show skeleton stat cards and chart area)

**Pattern:** `if (data === undefined) return <PageSkeleton />` — Convex returns `undefined` while loading.

---

### B-042 · PWA Manifest + Installable Prompt
**Status:** ⬜ Todo | **Priority:** P2 | **Depends on:** —

**Files to create/edit:**
- `apps/web/public/manifest.json` — name, short_name, icons (192px + 512px), theme_color, background_color, display: "standalone", start_url: "/"
- `apps/web/index.html` — add `<link rel="manifest" href="/manifest.json">`
- Create app icons in `apps/web/public/icons/`

---

### B-043 · Mobile Responsive Audit
**Status:** ⬜ Todo | **Priority:** P2 | **Depends on:** all UI tasks

Audit every customer-facing page at 375px viewport width. Fix issues:
- No horizontal overflow (use `overflow-x-hidden` on body if needed)
- All tap targets ≥ 44×44px
- Font sizes ≥ 14px on body text
- Floor plan SVG scrolls horizontally inside a `overflow-x-auto` container on mobile
- Admin tables/dashboards get a mobile-friendly card view instead of wide data tables

---

---

## Appendix: File Structure After Completion

```
packages/backend/convex/
├── schema.ts                  ← B-001
├── lib/
│   └── auth.ts                ← B-002
├── auth.ts                    (existing, updated in B-003)
├── auth.config.ts             (existing, updated in B-003)
├── http.ts                    (existing, updated in B-013)
├── users.ts                   ← B-004
├── notifications.ts           ← B-007
├── emails.ts                  ← B-008
├── tables.ts                  ← B-009
├── reservations.ts            ← B-012
├── payments.ts                ← B-013
├── events.ts                  ← B-017
├── eventRegistrations.ts      ← B-018
├── menu.ts                    ← B-024
├── orders.ts                  ← B-028
└── analytics.ts               ← B-031

apps/web/src/
├── routes.ts                  ← B-005 (updated)
├── routes/
│   ├── _index.tsx             ← B-019
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── reserve.tsx            ← B-011
│   ├── my-reservations.tsx    ← B-015
│   ├── my-orders.tsx          ← B-030
│   ├── profile.tsx            ← B-033
│   ├── events.$id.tsx         ← B-020
│   ├── table.$tableId.tsx     ← B-026
│   ├── staff/
│   │   ├── reservations.tsx   ← B-016
│   │   ├── orders.tsx         ← B-029
│   │   └── menu.tsx           ← B-025
│   └── admin/
│       ├── dashboard.tsx      ← B-032
│       ├── tables.tsx         ← B-010
│       ├── events.tsx         ← B-022
│       ├── events.$id.attendees.tsx  ← B-023
│       ├── menu.tsx           ← B-025
│       ├── staff.tsx          ← B-034
│       └── payments.tsx       ← B-040
├── components/
│   ├── layouts/
│   │   ├── customer-layout.tsx   ← B-006
│   │   ├── staff-layout.tsx      ← B-006
│   │   ├── admin-layout.tsx      ← B-006
│   │   └── route-guard.tsx       ← B-006
│   ├── notifications/
│   │   └── notification-bell.tsx ← B-007
│   ├── reserve/
│   │   ├── floor-plan.tsx        ← B-011
│   │   └── reservation-form-sheet.tsx  ← B-014
│   ├── events/
│   │   ├── event-card.tsx        ← B-019
│   │   └── post-registration-prompt.tsx  ← B-021
│   ├── menu/
│   │   ├── menu-view.tsx         ← B-027
│   │   ├── item-card.tsx         ← B-027
│   │   └── cart-drawer.tsx       ← B-027
│   └── orders/
│       └── order-status.tsx      ← B-030
└── lib/
    └── auth-client.ts            ← B-003
```

---

*Backlog owner: Development Team — generated from PRD v1.2*
