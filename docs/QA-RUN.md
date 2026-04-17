# QA run — browser automation (subset)

**Date:** 2026-04-17  
**Base URL:** `http://localhost:5173`  
**Tool:** `npx agent-browser` (fixed `wait` after load; `networkidle` not used because Convex keeps connections open).  
**Evidence:** screenshots under [docs/qa-screenshots/](qa-screenshots/).

Setelah menjalankan demo seed Convex ([NOTES.md — Demo seed](NOTES.md)), ulangi smoke `tables:list`, `/events/:id`, dan `/reserve` untuk data nyata di floor plan.

## Environment notes

| Item | Observation |
|------|-------------|
| Convex `tables:list` | Returned `[]` — no tables in deployment; floor plan SVG had no per-table interactive nodes in the accessibility tree. |
| Published events | No `/events/:id` links on home or events listing in this run — detail page not exercised. |
| Customer account | Created via **Sign up** (unique `qa.browser.<unix>@example.com`, password not recorded). Email verification not required (`requireEmailVerification: false`). |
| Staff / Admin | No credentials or pre-promoted roles — staff and admin UI sessions **not executed**. |

## Results vs [NOTES.md](NOTES.md) checklist (automated subset)

| Area | Check | Status | Notes / screenshot |
|------|-------|--------|-------------------|
| Auth | Sign up email/password | **Pass** | Redirect to `/`, toast success implied by navigation. `04-sign-up.png`, `05-home-logged-in.png` |
| Auth | Sign in page loads | **Pass** | `03-sign-in.png` |
| Auth | Google button present (when configured) | **Pass** | `Continue with Google` on sign-up (`04-sign-up.png`) |
| Auth | `users` row in Convex | **Skipped** | Manual / Dashboard |
| Roles | Customer cannot use `/staff/*` | **Pass** | `/staff/reservations` → `http://localhost:5173/` (`11-guard-staff.png`) |
| Roles | Customer cannot use `/admin/*` | **Pass** | `/admin/dashboard` → `/` after load (`10-guard-admin.png` shows transition; final URL `/`) |
| Roles | Staff cannot use `/admin/*` | **Blocked** | Needs staff session |
| Public | Home | **Pass** | `01-home.png`, `05-home-logged-in.png`, `13-home-375.png` |
| Public | `/events` | **Pass** | `02-events.png`, `02-events-anon.png` (anon session) |
| Public | `/events/:id` | **Skipped** | No published events with detail links in this deployment |
| Public | `/table/:tableId` | **Skipped** | No table IDs (`tables:list` empty) |
| Customer | `/reserve` | **Pass** (partial) | Page and legend load; no table selection possible without tables. `06-reserve.png`, `12-reserve-375.png` |
| Customer | `/my-reservations`, `/my-orders` | **Pass** | `07`, `08` |
| Customer | `/profile` edit persist | **Pass** | Display name → `QA Browser Updated`, nav reflects after save. `09-profile.png`, `14-profile-after-save.png` |
| Staff | Reservations / orders / menu | **Blocked** | No staff account |
| Admin | Dashboard, tables, events, menu, staff, payments | **Blocked** | No admin account |
| Polish | Skeleton | **Pass** (smoke) | Loader/skeleton not explicitly asserted; pages reached without hang |
| Polish | Responsive ~375px | **Pass** | `12-reserve-375.png`, `13-home-375.png` |
| Polish | PWA / manifest | **Skipped** | Not run |
| Non-functional | Mayar, webhooks, Resend, `SITE_URL`, Lighthouse | **Skipped** | Out of browser scope per plan |

## Manual follow-ups (you)

1. Promote or create **staff** and **admin** test users (Convex Dashboard or admin UI), then re-run staff/admin steps.
2. Seed **tables** (and optionally **events**) to exercise floor plan, `/table/:id`, and booking UI.
3. Complete payment, webhook, email, Google OAuth, Convex `users` inspection, and Lighthouse per [NOTES.md](NOTES.md).

## Screenshot index

| File | Description |
|------|-------------|
| `01-home.png` | Home (initial session) |
| `02-events.png` | Events (logged-in default session) |
| `02-events-anon.png` | Events (anonymous `qa-anon` session) |
| `03-sign-in.png` | Sign in |
| `04-sign-up.png` | Sign up |
| `05-home-logged-in.png` | Home after registration |
| `06-reserve.png` | Reserve (desktop) |
| `07-my-reservations.png` | My reservations |
| `08-my-orders.png` | My orders |
| `09-profile.png` | Profile (before or early) |
| `10-guard-admin.png` | Admin URL guard |
| `11-guard-staff.png` | Staff URL guard |
| `12-reserve-375.png` | Reserve 375×812 |
| `13-home-375.png` | Home 375×812 |
| `14-profile-after-save.png` | Profile after save |
