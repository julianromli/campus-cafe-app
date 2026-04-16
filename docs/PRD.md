# Product Requirements Document
## Campus Cafe — Full-Featured Campus Cafe Platform
**Version:** 1.2  
**Status:** Draft  
**Date:** April 16, 2026  
**Stack:** React Router · Convex · Better-Auth · shadcn/ui · TailwindCSS · Mayar.id · Cloudflare

---

## 1. Executive Summary

### Problem Statement

Campus Cafe currently manages all table reservations through WhatsApp, creating a frustrating experience for both customers and management. Customer messages get buried, bookings are missed, and there is no unified view of availability. Additionally, the cafe's primary business value — hosting community events (gaming nights, workshops, meetups) — lacks a dedicated discovery and registration surface.

### Proposed Solution

A full-stack web platform that unifies table reservations, event discovery & ticketing, in-seat food ordering, and cafe management operations into a single, real-time product. Customers get a cinema-style interactive table map, an event calendar with registration, and the ability to order food from their seat. Staff and admins get a live operations dashboard.

### Success Criteria

| # | Metric | Target |
|---|--------|--------|
| 1 | WhatsApp reservation volume | Reduced by **≥ 90%** within 30 days of launch |
| 2 | Table booking completion rate | **≥ 75%** of sessions that reach the reservation step |
| 3 | Event registration | **≥ 60%** of advertised events reach their seat limit |
| 4 | In-seat order adoption | **≥ 40%** of booked tables use in-app food ordering |
| 5 | Page load time (LCP) | **< 2.5 s** on 4G mobile connection |

---

## 2. User Personas & Roles

### 2.1 Personas

| Persona | Description | Key Goals |
|---------|-------------|-----------|
| **The Campus Regular** | Student/young professional who visits the cafe 2–4×/week | Reserve a favorite spot quickly, discover upcoming events |
| **The Event Attendee** | Person who primarily discovers the cafe through events (Nobar, Workshop, etc.) | Find and register for events, book a table for the event night |
| **The Cafe Staff** | Frontline employee managing orders and walk-ins | See live reservations, manage menu availability |
| **The Cafe Admin/Owner** | Owner or manager responsible for operations and growth | Full control over tables, events, menu, users, and revenue data |

### 2.2 Role Permissions Matrix

| Feature | Customer | Staff | Admin |
|---------|----------|-------|-------|
| View menu | ✅ | ✅ | ✅ |
| Reserve table | ✅ | ✅ (on behalf) | ✅ |
| Register for event | ✅ | ✅ | ✅ |
| Place in-seat food order | ✅ | ✅ (on behalf) | ✅ |
| View live reservation board | ❌ | ✅ | ✅ |
| Release table to available | ❌ | ✅ | ✅ |
| Manage menu items | ❌ | ✅ | ✅ |
| Create / edit events | ❌ | ❌ | ✅ |
| Manage table layout | ❌ | ❌ | ✅ |
| Process refund notification | ❌ | ❌ | ✅ |
| View analytics dashboard | ❌ | Limited | ✅ Full |
| Manage users & staff | ❌ | ❌ | ✅ |

---

## 3. Features & User Stories

### 3.1 Table Reservation System

**Core Flow:** Customer opens app → selects "Reserve a Table" → sees the interactive cafe floor plan → picks an available table → fills in date, start time, duration, and guest count → pays → receives booking confirmation.

#### User Stories

**US-01 — Browse Table Availability**
> As a customer, I want to see a visual map of the cafe floor plan that shows which tables are available or booked in real time, so I can make an informed choice before committing to a reservation.

**Acceptance Criteria:**
- The floor plan accurately reflects the real cafe layout with labeled zones (e.g., Indoor, Outdoor, VIP, Bar).
- Tables are color-coded: **Green = Available** (can be booked), **Red = Booked/Occupied** (not bookable), **Gray = Inactive** (hidden from customer view).
- Status updates propagate to all connected clients within **≤ 2 seconds** (Convex reactive query).
- Each table card shows: table number, seating capacity, zone name.
- Inactive tables are not rendered on the customer-facing map.

---

**US-02 — Reserve a Table**
> As a customer, I want to select a table, pick a date and start time, choose a duration, specify how many people are coming, and complete payment, so that my spot is guaranteed when I arrive.

**Acceptance Criteria:**
- Customer selects: date, start time (hour picker), duration (**1 hour / 2 hours / 3 hours**), guest count.
- Date/time picker supports same-day and advance bookings (configurable window, default: up to 7 days ahead).
- Guest count must be ≤ table capacity; validation is enforced on frontend and backend.
- If the table is booked by another user while the current customer is filling the form, the system surfaces an availability conflict error before reaching payment.
- On successful Mayar.id webhook confirmation, table status changes to `"booked"` atomically.
- Customer receives an on-screen confirmation and can view the booking under "My Reservations."
- Booking includes a unique confirmation code (used for check-in).

---

**US-03 — Manage My Reservations**
> As a customer, I want to view or cancel my upcoming reservations, so I have control over my bookings.

**Acceptance Criteria:**
- "My Reservations" screen lists upcoming and past bookings with their status.
- Cancellation is allowed up to a configurable cutoff (default: 2 hours before start time).
- Upon cancellation, the customer sees an in-app message: *"Pesananmu telah dibatalkan. Refund akan diproses oleh tim kami dalam 1–3 hari kerja."*
- Refund policy is displayed prominently on the checkout screen before payment is made.
- When a customer cancels, the admin receives an **in-app notification** containing: customer name, table number, booking date/time, and payment amount — so admin can process the refund manually via the Mayar.id dashboard.
- The cancelled booking does **not** automatically reopen the table to Available; table status is managed solely by admin/staff (see US-04b).

---

**US-04a — Admin: Configure Table Layout**
> As an admin, I want to define and update the cafe's table layout (number of tables, zones, capacities, positions), so the floor map matches the physical reality.

**Acceptance Criteria:**
- Admin can add, edit, and delete tables via a management UI.
- Each table has: ID, name/label, zone, capacity (min 1, max 20), position on the floor plan (drag-and-drop or coordinate input).
- Layout changes are reflected on the customer-facing map within 5 seconds (no full refresh needed).
- Inactive tables are hidden from the customer reservation UI.

---

**US-04b — Admin/Staff: Release Table Back to Available**
> As a staff member or admin, I want to manually mark a booked/occupied table as available again once the customer has left, so the floor map reflects the actual physical state of the cafe.

**Acceptance Criteria:**
- Staff and admin can see all tables on a live operations board with their current status.
- A "Release Table" action button is available on any table with status `booked` or `occupied`.
- On confirmation, the table status changes to `available` and is immediately visible to customers on the floor map (≤ 2 seconds via Convex reactive update).
- The release action is logged with timestamp and the staff/admin ID who performed it (for audit trail).
- There is no automatic timer-based release — table status **only** changes to `available` when explicitly released by staff/admin.

---

### 3.2 Event Discovery & Registration

**Core Flow:** Homepage displays upcoming events → customer clicks event → reads details → registers (free or paid) → optionally links to a table reservation for the event night.

#### User Stories

**US-05 — Discover Events**
> As a customer, I want to see a list of upcoming events at the cafe on the homepage, so I know what's happening and can plan to attend.

**Acceptance Criteria:**
- Homepage Event section shows at minimum: event name, date/time, category tag (e.g., Nobar, Workshop, Meetup), cover image, available seats count.
- Events are sorted chronologically (soonest first).
- Past events are hidden from the public list (or shown in an "Archive" section).
- Events with 0 seats remaining are marked "Full" but still visible.

---

**US-06 — Event Detail & Registration**
> As a customer, I want to read the full details of an event and register (paying if required), so I have a confirmed spot.

**Acceptance Criteria:**
- Event detail page includes: full description, schedule, host/organizer name, cover image/gallery, capacity, seats remaining, ticket price (or "Free").
- Registration button is disabled when event is full.
- Paid events process payment via Mayar.id before confirming registration.
- Free events require only a name/email (or account login) to register.
- After registration, customer sees a confirmation screen with a QR code or unique code for check-in.
- Seat count updates in real time on the detail page as registrations come in.

---

**US-07 — Link Event Registration to Table**
> As a customer registering for an event, I want to optionally reserve a table for the event night as part of the same flow, so I don't lose my preferred spot.

**Acceptance Criteria:**
- After event registration confirmation, an optional prompt: "Want to also reserve a table for this event?" that deep-links to the reservation flow with the event's date/time pre-filled.
- Tables reserved during an event flow are tagged with the event ID for admin visibility.

---

**US-08 — Admin: Create & Manage Events**
> As an admin, I want to create, edit, publish, and delete events, so the cafe's event calendar stays up to date.

**Acceptance Criteria:**
- Create event form includes: title, description (rich text), date/time (start & end), category, cover image upload, capacity (seat limit), ticket price (0 = free), registration deadline.
- Admin can toggle event status: Draft (not public) / Published (visible to customers).
- Admin can view registered attendees list with export to CSV.
- Admin can send a notification/reminder to all registered attendees (in-app notification + optional email).
- Deleting a published event with existing registrations requires explicit confirmation and triggers automated notice to registrants.

---

### 3.3 In-Seat Food Pre-Ordering

**Core Flow:** Customer (reserved or walk-in) scans the static QR code on the table → app opens the menu pre-loaded for that table → browses menu → adds items to cart → places order → kitchen receives order → customer gets live status update.

**QR Code Design:** Each table has one permanently printed QR code that encodes the URL `campus-cafe.app/table/{tableId}`. QR codes never change and do not expire.

#### User Stories

**US-09 — Browse & Order from Menu**
> As a customer at a table (whether I pre-booked or walked in), I want to scan the QR code and place a food/beverage order from my phone without going to the counter, so my experience is seamless.

**Acceptance Criteria:**
- Scanning the QR code opens the menu pre-filtered to that specific table — no manual table selection needed.
- Menu is organized by category (Food, Drinks, Snacks, etc.) with item name, description, photo, price.
- On scan, the app silently checks whether the logged-in user has an active confirmed reservation for that table at the current time:
  - **If yes (reserved customer):** order is automatically linked to the reservation (`reservationId`).
  - **If no (walk-in customer):** order is recorded as a walk-in order for that table (no `reservationId`); ordering is still fully permitted.
- Cart persists per session and is tied to the table.
- Order submission sends the order to the staff kitchen queue.
- Customer sees live order status: Pending → Preparing → Ready.
- Items marked "Sold Out" are non-orderable (grayed out, real-time update).
- Customer must be logged in to place an order (prompts login/register if not authenticated).

---

**US-10 — Staff: Manage Incoming Orders**
> As a staff member, I want to see all incoming in-seat orders in a live queue, so I can prepare and fulfill them efficiently.

**Acceptance Criteria:**
- Order queue view shows: order number, table number, items + quantities, time placed, current status.
- Staff can update order status: Pending → Preparing → Ready.
- Queue auto-updates via Convex subscription (no manual refresh).
- Completed orders are moved to an "Order History" tab.

---

### 3.4 Digital Menu Management

#### User Stories

**US-11 — Admin/Staff: Manage Menu**
> As a staff member or admin, I want to add, edit, and remove menu items and toggle availability, so the customer-facing menu is always accurate.

**Acceptance Criteria:**
- Menu item fields: name, description, price, category, image, availability toggle (Available / Sold Out).
- Category management: create, rename, reorder, delete categories.
- Availability changes are reflected on customer app within **≤ 2 seconds**.
- Bulk availability toggle available (e.g., mark all drinks as "Sold Out" for after-hours).

---

### 3.5 Admin Analytics Dashboard

#### User Stories

**US-12 — Admin: View Live Operations Overview**
> As an admin, I want a real-time dashboard showing today's reservations, event registrations, and order revenue, so I can monitor operations at a glance.

**Acceptance Criteria:**
- Dashboard widgets (today's view):
  - Total reservations booked vs. capacity
  - Table occupancy heatmap
  - Active in-seat orders
  - Revenue (from reservations + event tickets + food orders)
- 30-day trend charts: reservations, event attendance, food order volume.
- All data refreshes without manual reload.

---

### 3.6 Authentication & User Management

#### User Stories

**US-13 — Customer: Register & Login**
> As a new customer, I want to create an account with email/password or social login, so I can manage my bookings and registrations.

**Acceptance Criteria:**
- Registration via email + password, with email verification.
- Social login: Google (minimum; extensible).
- Authenticated sessions managed by Better-Auth + Convex.
- Profile page: name, phone number, profile picture, booking history.

---

**US-14 — Admin: Manage Staff Accounts**
> As an admin, I want to invite staff members and assign roles, so access is controlled.

**Acceptance Criteria:**
- Admin invites staff via email (invite link valid for 48 hours).
- Role assignment: Staff or Admin.
- Admin can revoke staff access at any time.
- Revoked staff are immediately logged out on next action.

---

## 4. Non-Goals (v1.0 Scope Exclusions)

The following are explicitly **out of scope** for v1.0 to protect timeline and focus:

| # | Excluded Feature | Rationale |
|---|-----------------|-----------|
| 1 | Native mobile app (iOS/Android) | PWA via the web app is sufficient for v1.0 |
| 2 | Multi-branch / multi-location support | Single venue for now |
| 3 | Loyalty/points program | Post-launch feature |
| 4 | Community event hosting (customer-created events) | Only admin creates events in v1.0 |
| 5 | Third-party delivery integrations (GoFood, GrabFood) | Out of scope; in-cafe only |
| 6 | AI-powered recommendations | Phase 2 consideration |
| 7 | Printed kitchen receipt / POS hardware | Digital-only in v1.0 |

---

## 5. Technical Specifications

### 5.1 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Client (React + React Router, TailwindCSS,      │
│  shadcn/ui, deployed on Cloudflare Pages)         │
└───────────────────┬─────────────────────────────┘
                    │ WebSocket (Convex Reactive Queries)
                    │ HTTPS (Convex Mutations/Actions)
┌───────────────────▼─────────────────────────────┐
│  Convex Backend                                   │
│  ├── Auth layer (Better-Auth integration)         │
│  ├── Queries    (tables, events, menu, orders)    │
│  ├── Mutations  (book table, register event, etc.)│
│  └── Actions    (Mayar.id payment webhook handler)│
└───────────────────┬─────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Mayar.id           │
         │   (Payment Gateway)  │
         └─────────────────────┘
```

### 5.2 Database Schema (Convex)

#### `users`
```
_id, name, email, role: "customer"|"staff"|"admin", phone?, avatarUrl?, createdAt
```

#### `tables`
```
_id, label, zone: string, capacity: number, positionX: number, positionY: number,
status: "available"|"booked"|"occupied"|"inactive",
lastReleasedBy?: userId, lastReleasedAt?: number, createdAt
```
Indexes: `by_zone`, `by_status`

> **Status lifecycle:** `available` → (customer books + pays) → `booked` → (customer arrives, staff marks) → `occupied` → (staff/admin releases) → `available`. No automatic release — only manual action by staff or admin.

#### `reservations`
```
_id, tableId, userId, guestCount,
startTime: number (Unix ms), durationHours: 1 | 2 | 3,
status: "pending"|"confirmed"|"cancelled", eventId?, paymentRef, createdAt
```
Indexes: `by_tableId_startTime`, `by_userId`, `by_status`

#### `events`
```
_id, title, description, coverImage, category, startTime, endTime,
capacity, seatsRemaining, ticketPrice, status: "draft"|"published",
registrationDeadline, createdBy, createdAt
```
Indexes: `by_status_startTime`

#### `eventRegistrations`
```
_id, eventId, userId, ticketCode, paymentRef, status: "confirmed"|"cancelled", createdAt
```
Indexes: `by_eventId`, `by_userId`

#### `menuCategories`
```
_id, name, displayOrder, createdAt
```

#### `menuItems`
```
_id, categoryId, name, description, price, imageUrl,
available: boolean, createdAt
```
Indexes: `by_categoryId`, `by_available`

#### `orders`
```
_id, tableId, reservationId?: Id<"reservations"> | null,
userId, items: [{menuItemId, name, price, qty}],
total, status: "pending"|"preparing"|"ready"|"completed",
orderType: "reserved" | "walkin", createdAt
```
Indexes: `by_tableId`, `by_status`, `by_userId`

> `reservationId` is `null` for walk-in orders. `orderType` is set automatically by the server when the order is created.

#### `payments`
```
_id, refId (Mayar.id), type: "reservation"|"event_ticket"|"food_order",
targetId, amount, currency: "IDR", status: "pending"|"paid"|"failed"|"refunded", createdAt
```
Indexes: `by_refId`, `by_targetId`

### 5.3 Integration Points

#### Mayar.id Payment Gateway
- **Payment flow:** Frontend initiates payment → Convex Action creates payment link via Mayar.id API → Customer redirected to Mayar.id hosted checkout → Mayar.id fires `payment.received` webhook to Convex HTTP Action → Convex verifies payload → confirms booking/registration atomically.
- **Webhook security:** Verify Mayar.id signature header on every inbound event; reject requests without a valid signature.
- **Idempotency:** Webhook handler checks if `transactionId` was already processed before mutating state, preventing duplicate confirmations.
- **Refund policy:** Refunds are **fully manual** — no Refund API is used. When a cancellation occurs: (1) app shows customer a message confirming the cancellation and expected refund timeline, (2) admin receives an in-app notification with transaction details, (3) admin processes the refund manually via the Mayar.id merchant dashboard.
- **Supported payment methods:** QRIS, bank transfer, e-wallet — all handled natively by Mayar.id checkout; no custom payment UI required.

#### Better-Auth + Convex
- Session tokens issued by Better-Auth, validated in Convex via `ctx.auth`.
- Role stored in the `users` table; middleware checks role before every mutation.

#### Convex Real-Time
- Table availability: `useQuery(api.tables.list)` — reactive; updates on any table mutation.
- Order queue: `useQuery(api.orders.listActive)` — staff screen auto-refreshes.
- Event seat count: `useQuery(api.events.get, { id })` — `seatsRemaining` decrements on registration.

### 5.4 Security & Privacy

| Concern | Mitigation |
|---------|-----------|
| Unauthorized role escalation | Role stored server-side in Convex; never trust client-supplied role claims |
| Payment tampering | Booking confirmed only after Mayar.id webhook with valid signature; never on client callback |
| PII exposure | `users` table readable only by the owner and admins; staff cannot read other users' data |
| OWASP Top 10 | All mutations validate arguments via `v` (Convex validators); no raw string SQL |
| HTTPS everywhere | Cloudflare terminates TLS; no mixed content |
| Session hijacking | Better-Auth handles CSRF; tokens are httpOnly cookies |

---

## 6. UX & Design Guidelines

- **Interactive Table Map:** SVG or canvas-based floor plan. Tables are clickable elements. Color-coded: Green = Available, Red = Booked/Occupied, Gray = Inactive. Tooltip on hover shows table name, capacity, and zone. Responsive for mobile.
- **Event Cards:** Cover-image-led card design. "Seats remaining" counter with urgency styling when < 10% remaining.
- **QR Code Landing:** Scanning a table QR opens a fast-loading menu page (no redirect loops). If not logged in, a bottom-sheet login prompt appears — customer can still browse menu while unauthenticated but must log in to place an order.
- **Order Status:** Progress stepper (Pending → Preparing → Ready) displayed prominently on the customer's order screen.
- **Admin Dashboard:** Dark/neutral-toned data dashboard (shadcn/ui charts). Key metrics above the fold, accessible from a sidebar nav.
- **Loading States:** Skeleton screens for all data-fetched views; no blank white flashes.
- **Mobile First:** All customer-facing flows optimized for 375px+ screens.

---

## 7. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Mayar.id webhook delivery failure | Medium | High — booking not confirmed | Implement idempotent webhook handler + polling fallback; expose manual "sync payment" button for admin |
| Double-booking race condition | Low | High — two users book same table simultaneously | Use Convex transaction in the `bookTable` mutation to check availability and write atomically |
| Convex cold-start latency on first load | Low | Medium | Pre-fetch critical queries (menu, table list) at app shell level |
| Table layout doesn't match real cafe | Medium | Medium (UX confusion) | Admin layout editor built early; demo walkthrough with owner before launch |
| Low customer app adoption (still use WhatsApp) | Medium | High (defeats purpose) | QR code standees on each table; WhatsApp auto-reply directs to app link |

---

## 8. Phased Roadmap

### Phase 1 — MVP Core (Weeks 1–4)
- [ ] Auth (email + Google login, role system)
- [ ] Table layout admin editor
- [ ] Customer-facing interactive floor map
- [ ] Table reservation flow (date/time/guest count)
- [ ] Mayar.id payment integration (reservation)
- [ ] Real-time table status updates
- [ ] Basic admin reservation management view

### Phase 2 — Events & Menu (Weeks 5–8)
- [ ] Event creation & management (admin)
- [ ] Event discovery homepage & detail page
- [ ] Event registration (free + paid via Mayar.id)
- [ ] Seat count real-time updates
- [ ] Menu categories & item management (admin/staff)
- [ ] Customer-facing menu display
- [ ] In-seat food ordering (basic flow)

### Phase 3 — Operations & Polish (Weeks 9–12)
- [ ] Staff order queue (live kitchen view)
- [ ] In-seat order status tracking (customer)
- [ ] Admin analytics dashboard (revenue, reservations, events)
- [ ] Event–reservation link (book table from event page)
- [ ] Email notifications (booking confirmation, event reminder)
- [ ] PWA manifest (installable on mobile)
- [ ] Performance hardening & accessibility audit

### Future (Post-v1.0)
- Loyalty/points program
- AI-powered seat/menu recommendations
- Multi-event co-hosting (community hosts)
- Export reports (CSV/PDF)
- Native app wrapper (Capacitor)

---

## 9. Open Questions

### Resolved

| # | Question | Decision |
|---|----------|----------|
| ~~1~~ | Time slot model for reservations? | **Model C** — Customer picks start time + duration (1 / 2 / 3 hours) |
| ~~2~~ | Refund policy for paid reservations & event tickets? | **Manual** — App shows cancellation message to customer; admin receives in-app notification and processes refund manually via Mayar.id dashboard |
| ~~3~~ | Turnover time / minimum booking duration? | **None** — Table availability is controlled entirely by admin/staff. No automatic release; staff manually marks a table as Available after customer leaves |

### Resolved (continued)

| # | Question | Decision |
|---|----------|----------|
| ~~5~~ | Email/notification provider? | **Resend** — booking confirmation, event reminder, cancellation notification |

### Resolved (continued)

| # | Question | Decision |
|---|----------|----------|
| ~~4~~ | Static or dynamic QR codes for tables? | **Static (Model A)** — QR codes are printed once per table and never change. Walk-in customers can also scan and order. App auto-detects whether the scanning user has an active reservation for that table and links the order accordingly; walk-ins are recorded as unlinked orders. |

> **All open questions resolved. PRD is ready for development.**

---

*Document owner: Development Team*  
*Last updated: April 16, 2026 — v1.2: Resolved all Open Questions. Static QR (Model A) with walk-in support; Resend for email; in-seat ordering open to both reserved and walk-in customers.*
