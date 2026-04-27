# Product Requirements Document

## Campus Cafe — Full-Featured Campus Cafe Platform

**Version:** 1.3  
**Status:** Draft  
**Date:** April 17, 2026  
**Stack:** React Router · Convex · Better-Auth · shadcn/ui · TailwindCSS · Pakasir QRIS · Cloudflare

---

## 1. Executive Summary

### Problem Statement

Campus Cafe currently manages all table reservations through WhatsApp, creating a frustrating experience for both customers and management. Customer messages get buried, bookings are missed, and there is no unified view of availability. Additionally, the cafe's primary business value — hosting community events (gaming nights, workshops, meetups) — lacks a lightweight way for customers to see what is coming up and find the official event page.

### Proposed Solution

A full-stack web platform that unifies table reservations, **event discovery (information-only)**, in-seat food ordering, and cafe management operations into a single, real-time product. Customers get a cinema-style interactive table map, a curated list of upcoming and ongoing events with links to each event’s official page (registration and ticketing happen **outside** this app), and the ability to order food from their seat. Staff and admins get a live operations dashboard.

### Success Criteria


| #   | Metric                        | Target                                                |
| --- | ----------------------------- | ----------------------------------------------------- |
| 1   | WhatsApp reservation volume   | Reduced by **≥ 90%** within 30 days of launch         |
| 2   | Table booking completion rate | **≥ 75%** of sessions that reach the reservation step |
| 3   | Event discovery engagement    | **≥ 40%** of homepage sessions click through to an event detail or external event link |
| 4   | In-seat order adoption        | **≥ 40%** of booked tables use in-app food ordering   |
| 5   | Page load time (LCP)          | **< 2.5 s** on 4G mobile connection                   |


---

## 2. User Personas & Roles

### 2.1 Personas


| Persona                  | Description                                                                    | Key Goals                                                       |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **The Campus Regular**   | Student/young professional who visits the cafe 2–4×/week                       | Reserve a favorite spot quickly, discover upcoming events       |
| **The Event Attendee**   | Person who primarily discovers the cafe through events (Nobar, Workshop, etc.) | See what is on, open the official event page, optionally reserve a table separately |
| **The Cafe Staff**       | Frontline employee managing orders and walk-ins                                | See live reservations, manage menu availability                 |
| **The Cafe Admin/Owner** | Owner or manager responsible for operations and growth                         | Full control over tables, events, menu, users, and revenue data |


### 2.2 Role Permissions Matrix


| Feature                     | Customer | Staff         | Admin  |
| --------------------------- | -------- | ------------- | ------ |
| View menu                   | ✅        | ✅             | ✅      |
| Reserve table               | ✅        | ✅ (on behalf) | ✅      |
| View event listings         | ✅        | ✅             | ✅      |
| Place in-seat food order    | ✅        | ✅ (on behalf) | ✅      |
| View live reservation board | ❌        | ✅             | ✅      |
| Release table to available  | ❌        | ✅             | ✅      |
| Manage menu items           | ❌        | ✅             | ✅      |
| Create / edit events        | ❌        | ❌             | ✅      |
| Manage table layout         | ❌        | ❌             | ✅      |
| Process refund notification | ❌        | ❌             | ✅      |
| View analytics dashboard    | ❌        | Limited       | ✅ Full |
| Manage users & staff        | ❌        | ❌             | ✅      |


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
- On successful Pakasir webhook confirmation, table status changes to `"booked"` atomically.
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
- When a customer cancels, the admin receives an **in-app notification** containing: customer name, table number, booking date/time, and payment amount — so admin can process the refund manually via the Pakasir dashboard.
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

### 3.2 Event Discovery (Information-Only)

**Scope:** Events in this app are **for discovery and information** — customers see what is **upcoming or currently ongoing** at the cafe. **Registration, ticketing, and payment for events are not handled in this app**; the customer is directed to the **official external event page** (e.g. organizer website, ticketing partner, or social link) for anything beyond reading the summary here.

**Core Flow:** Homepage displays upcoming/ongoing events → customer opens an event → reads details on the in-app detail page → primary CTA opens the **external official page** in a new tab (or same-tab navigation to that URL). Table reservation remains a **separate** flow (`Reserve a Table`) and is not coupled to event signup.

#### User Stories

**US-05 — Discover Events**

> As a customer, I want to see a list of upcoming and ongoing events at the cafe on the homepage, so I know what's happening and can decide what to explore further.

**Acceptance Criteria:**

- Homepage Event section shows at minimum: event name, date/time (or “Sedang berlangsung” when applicable), category tag (e.g., Nobar, Workshop, Meetup), cover image.
- Events are sorted chronologically (soonest first). Ongoing events (current time within start–end) may be highlighted or pinned per UX spec.
- Past events (ended) are **not** shown in the default public list.
- Cards link to the in-app event detail route `/events/:id` (or equivalent).

---

**US-06 — Event Detail & External Link**

> As a customer, I want to read clear details about an event in the app and then continue on the official event page for registration or more info, so I am not confused about where the real signup happens.

**Acceptance Criteria:**

- Event detail page includes: title, full description (rich text or markdown), schedule (start & end), host/organizer name (optional), cover image, category.
- **Primary CTA** is a single clear action (e.g. “Buka halaman resmi event” / “Info & daftar di situs penyelenggara”) that navigates to the **admin-configured external URL** (`https://…`). No in-app registration, no ticket purchase, no QR ticket, no seat inventory tied to signups in this app.
- Optional secondary link: “Reservasi meja” → `/reserve` (no requirement to pass `eventId` for signup; optional prefill of date is a UX nicety, not tied to event registration).

---

**US-07 — Admin: Curate Event Listings**

> As an admin, I want to create, edit, publish, and remove event listings, so customers always see accurate dates and the correct external link.

**Acceptance Criteria:**

- Create/edit form includes: title, description (rich text), date/time (start & end), category, cover image upload, **external URL** (required for published events), status Draft / Published.
- Published events appear in the public listing; drafts do not.
- No attendees list, CSV export of registrants, or in-app reminders to “registered users” — those belong on the external platform.
- Delete is allowed with a confirmation dialog; no “registrant” guardrails inside this app.

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

> As an admin, I want a real-time dashboard showing today's reservations and order revenue, so I can monitor operations at a glance.

**Acceptance Criteria:**

- Dashboard widgets (today's view):
  - Total reservations booked vs. capacity
  - Table occupancy heatmap
  - Active in-seat orders
  - Revenue (from reservations + food orders; **not** from in-app event ticketing — events are listing-only)
- 30-day trend charts: reservations, food order volume.
- All data refreshes without manual reload.

---

### 3.6 Authentication & User Management

#### User Stories

**US-13 — Customer: Register & Login**

> As a new customer, I want to create an account with email/password or social login, so I can manage my bookings and orders.

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


| #   | Excluded Feature                                     | Rationale                                  |
| --- | ---------------------------------------------------- | ------------------------------------------ |
| 1   | Native mobile app (iOS/Android)                      | PWA via the web app is sufficient for v1.0 |
| 2   | Multi-branch / multi-location support                | Single venue for now                       |
| 3   | Loyalty/points program                               | Post-launch feature                        |
| 4   | Community event hosting (customer-created events)    | Only admin creates events in v1.0          |
| 5   | Third-party delivery integrations (GoFood, GrabFood) | Out of scope; in-cafe only                 |
| 6   | AI-powered recommendations                           | Phase 2 consideration                      |
| 7   | In-app event registration, ticketing, or attendee management | Out of scope; events are informational with external links |
| 8   | Printed kitchen receipt / POS hardware               | Digital-only in v1.0                       |


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
│  ├── Mutations  (book table, manage event listings, etc.)│
│  └── Actions    (Pakasir payment actions + webhook handler)│
└───────────────────┬─────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Pakasir QRIS       │
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
_id, title, description, coverImage?, category, startTime, endTime,
externalUrl: string (https URL to official event page),
status: "draft"|"published", createdBy, createdAt
```

Indexes: `by_status_startTime`

> **Note:** Legacy or experimental tables (e.g. `eventRegistrations`, `event_ticket` payment types) may exist in code from earlier designs; the **product scope** for events is listing + external link only — no in-app registration or ticket sales.

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
_id, refId (Pakasir order_id), provider: "pakasir",
type: "reservation"|"food_order",
targetId, amount, currency: "IDR", status: "pending"|"paid"|"failed"|"refunded", createdAt
```

Indexes: `by_refId`, `by_targetId`

### 5.3 Integration Points

#### Pakasir QRIS Payment Gateway

- **Payment flow:** Frontend initiates payment → Convex Action creates a Pakasir QRIS transaction → Customer pays from the in-app QR sheet → Pakasir fires a webhook to Convex HTTP Action → Convex re-checks `transactiondetail` before confirming the booking atomically. Event listings do not use in-app payments.
- **Webhook security:** Do not trust webhook bodies directly. Re-verify every Pakasir callback through `transactiondetail` and only confirm when project, order ID, amount, and completed status match the local pending payment.
- **Idempotency:** Webhook handler checks if `order_id` was already processed before mutating state, preventing duplicate confirmations.
- **Refund policy:** Refunds are **fully manual** — no Refund API is used. When a cancellation occurs: (1) app shows customer a message confirming the cancellation and expected refund timeline, (2) admin receives an in-app notification with transaction details, (3) admin processes the refund manually via the Pakasir merchant dashboard.
- **Supported payment method:** QRIS via Pakasir; no other payment gateway is part of the active product scope.

#### Better-Auth + Convex

- Session tokens issued by Better-Auth, validated in Convex via `ctx.auth`.
- Role stored in the `users` table; middleware checks role before every mutation.

#### Convex Real-Time

- Table availability: `useQuery(api.tables.list)` — reactive; updates on any table mutation.
- Order queue: `useQuery(api.orders.listActive)` — staff screen auto-refreshes.
- Event detail (public): `useQuery(api.events.getById, { id })` — returns published event fields including `externalUrl` for the CTA (no seat inventory in product scope).

### 5.4 Security & Privacy


| Concern                      | Mitigation                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Unauthorized role escalation | Role stored server-side in Convex; never trust client-supplied role claims                   |
| Payment tampering            | Booking confirmed only after Pakasir webhook payload is re-verified via `transactiondetail`; never on client callback |
| PII exposure                 | `users` table readable only by the owner and admins; staff cannot read other users' data     |
| OWASP Top 10                 | All mutations validate arguments via `v` (Convex validators); no raw string SQL              |
| HTTPS everywhere             | Cloudflare terminates TLS; no mixed content                                                  |
| Session hijacking            | Better-Auth handles CSRF; tokens are httpOnly cookies                                        |


---

## 6. UX & Design Guidelines

- **Interactive Table Map:** SVG or canvas-based floor plan. Tables are clickable elements. Color-coded: Green = Available, Red = Booked/Occupied, Gray = Inactive. Tooltip on hover shows table name, capacity, and zone. Responsive for mobile.
- **Event Cards:** Cover-image-led card design; emphasize date/time and category; primary intent is **inform** and route to detail → external official page.
- **QR Code Landing:** Scanning a table QR opens a fast-loading menu page (no redirect loops). If not logged in, a bottom-sheet login prompt appears — customer can still browse menu while unauthenticated but must log in to place an order.
- **Order Status:** Progress stepper (Pending → Preparing → Ready) displayed prominently on the customer's order screen.
- **Admin Dashboard:** Dark/neutral-toned data dashboard (shadcn/ui charts). Key metrics above the fold, accessible from a sidebar nav.
- **Loading States:** Skeleton screens for all data-fetched views; no blank white flashes.
- **Mobile First:** All customer-facing flows optimized for 375px+ screens.

---

## 7. Risks & Mitigations


| Risk                                           | Probability | Impact                                          | Mitigation                                                                                             |
| ---------------------------------------------- | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Pakasir webhook delivery failure               | Medium      | High — booking not confirmed                    | Implement idempotent webhook handler + polling fallback; expose manual "sync payment" button for admin |
| Double-booking race condition                  | Low         | High — two users book same table simultaneously | Use Convex transaction in the `bookTable` mutation to check availability and write atomically          |
| Convex cold-start latency on first load        | Low         | Medium                                          | Pre-fetch critical queries (menu, table list) at app shell level                                       |
| Table layout doesn't match real cafe           | Medium      | Medium (UX confusion)                           | Admin layout editor built early; demo walkthrough with owner before launch                             |
| Low customer app adoption (still use WhatsApp) | Medium      | High (defeats purpose)                          | QR code standees on each table; WhatsApp auto-reply directs to app link                                |


---

## 8. Phased Roadmap

### Phase 1 — MVP Core (Weeks 1–4)

- Auth (email + Google login, role system)
- Table layout admin editor
- Customer-facing interactive floor map
- Table reservation flow (date/time/guest count)
- Pakasir QRIS payment integration (reservation)
- Real-time table status updates
- Basic admin reservation management view

### Phase 2 — Events & Menu (Weeks 5–8)

- Event listing CRUD & publish (admin), including **external URL**
- Event discovery on homepage & in-app event detail with **outbound CTA** to official page
- Menu categories & item management (admin/staff)
- Customer-facing menu display
- In-seat food ordering (basic flow)

### Phase 3 — Operations & Polish (Weeks 9–12)

- Staff order queue (live kitchen view)
- In-seat order status tracking (customer)
- Admin analytics dashboard (revenue, reservations)
- Optional: prominent “Reservasi meja” from event detail (same app; not tied to external event signup)
- Email notifications (booking confirmation; optional operational emails — not event-attendee lists)
- PWA manifest (installable on mobile)
- Performance hardening & accessibility audit

### Future (Post-v1.0)

- Loyalty/points program
- AI-powered seat/menu recommendations
- Multi-event co-hosting (community hosts)
- Export reports (CSV/PDF)
- Native app wrapper (Capacitor)

---

## 9. Open Questions

### Resolved


| #     | Question                                             | Decision                                                                                                                                                   |
| ----- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~1~~ | Time slot model for reservations?                    | **Model C** — Customer picks start time + duration (1 / 2 / 3 hours)                                                                                       |
| ~~2~~ | Refund policy for paid **table** reservations? | **Manual** — App shows cancellation message to customer; admin receives in-app notification and processes refund manually via Pakasir dashboard (in-app event ticketing N/A) |
| ~~3~~ | Turnover time / minimum booking duration?            | **None** — Table availability is controlled entirely by admin/staff. No automatic release; staff manually marks a table as Available after customer leaves |


### Resolved (continued)


| #     | Question                     | Decision                                                                     |
| ----- | ---------------------------- | ---------------------------------------------------------------------------- |
| ~~5~~ | Email/notification provider? | **Resend** — booking confirmation, event reminder, cancellation notification |


### Resolved (continued)


| #     | Question                               | Decision                                                                                                                                                                                                                                                                               |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~4~~ | Static or dynamic QR codes for tables? | **Static (Model A)** — QR codes are printed once per table and never change. Walk-in customers can also scan and order. App auto-detects whether the scanning user has an active reservation for that table and links the order accordingly; walk-ins are recorded as unlinked orders. |


> **All open questions resolved. PRD is ready for development.**

---

*Document owner: Development Team*  
*Last updated: April 17, 2026 — v1.3: Events scoped as information-only discovery with external official links; no in-app event registration/ticketing per product direction.*