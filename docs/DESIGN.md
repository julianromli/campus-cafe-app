# UI/UX Design Specification

## Campus Cafe — Page-by-Page Design Guide for AI Prototype Generation

**Version:** 1.1 | **Date:** April 17, 2026

---

## Context for the AI Agent

Campus Cafe is a web platform for a real Indonesian campus cafe that hosts frequent community events (gaming nights, workshops, meetups). The app unifies three experiences: **table reservations** (like cinema seat booking), **event discovery (information-only; outbound link to the official event page)**, and **in-seat food ordering via QR code**. The audience is students and young professionals (18–28 years old).

**What this app is NOT:**

- Not a luxury fine-dining booking app (avoid elegant serif fonts, white glove aesthetics)
- Not a corporate SaaS dashboard (avoid cold blues, enterprise feel)
- Not a delivery app (no maps, no courier tracking)

**What this app IS:**

- A **warm, vibrant, community-driven** platform with a cozy-cafe-at-night aesthetic
- Inspired by: **TIX.ID** (cinema seat selection UX, bottom tab nav, clear information hierarchy) + **Eveno** (dark event app) + modern food ordering apps like Zomato dark mode
- Think: dark background with warm amber glow, like a coffee shop at 8pm

---

## Design System

### Color Palette (Dark Theme — Default)

```css
/* Campus Cafe Custom shadcn/ui Theme */
:root {
  --radius: 0.75rem;
}

.dark {
  /* Backgrounds — warm dark, like burnt coffee */
  --background:    oklch(0.12 0.015 60);   /* #100F08 – near-black warm */
  --card:          oklch(0.17 0.015 60);   /* #1A1810 – card surface */
  --popover:       oklch(0.20 0.015 60);   /* #201E14 – elevated surface */

  /* Text */
  --foreground:    oklch(0.95 0.02 85);    /* #F5F0E8 – warm off-white */
  --muted-foreground: oklch(0.60 0.04 75); /* #9A8E72 – warm muted */

  /* Primary — Amber (cafe warmth, CTAs, active states) */
  --primary:        oklch(0.75 0.17 75);   /* #F59E0B – amber */
  --primary-foreground: oklch(0.12 0.015 60); /* dark text on amber */

  /* Secondary */
  --secondary:      oklch(0.22 0.015 60);  /* #252014 */
  --secondary-foreground: oklch(0.85 0.03 80);

  /* Muted / subtle */
  --muted:          oklch(0.20 0.012 60);
  --accent:         oklch(0.25 0.02 65);   /* hover state */
  --accent-foreground: oklch(0.95 0.02 85);

  /* Semantic */
  --destructive:    oklch(0.65 0.22 25);   /* red for booked/error */
  --border:         oklch(0.25 0.012 60);
  --input:          oklch(0.22 0.015 60);
  --ring:           oklch(0.75 0.17 75);   /* amber focus ring */

  /* Status colors (non-shadcn, custom) */
  --status-available:  #34D399;  /* emerald green */
  --status-booked:     #F87171;  /* red */
  --status-occupied:   #FB923C;  /* orange */
  --status-inactive:   #4B5563;  /* gray */

  /* Chart colors */
  --chart-1: oklch(0.75 0.17 75);   /* amber */
  --chart-2: oklch(0.65 0.15 160);  /* teal */
  --chart-3: oklch(0.70 0.18 310);  /* violet */
  --chart-4: oklch(0.68 0.20 25);   /* coral */
  --chart-5: oklch(0.80 0.12 100);  /* lime */

  /* Sidebar */
  --sidebar:              oklch(0.14 0.015 60);
  --sidebar-foreground:   oklch(0.85 0.03 80);
  --sidebar-primary:      oklch(0.75 0.17 75);
  --sidebar-accent:       oklch(0.20 0.015 60);
  --sidebar-border:       oklch(0.22 0.012 60);
}
```

### Typography


| Role                  | Font                | Weight | Size        |
| --------------------- | ------------------- | ------ | ----------- |
| Display (hero titles) | `Plus Jakarta Sans` | 700    | 2.5rem–4rem |
| Heading H1            | `Plus Jakarta Sans` | 700    | 1.875rem    |
| Heading H2            | `Plus Jakarta Sans` | 600    | 1.5rem      |
| Heading H3            | `Plus Jakarta Sans` | 600    | 1.25rem     |
| Body default          | `Inter`             | 400    | 0.9375rem   |
| Body medium           | `Inter`             | 500    | 0.9375rem   |
| Caption / label       | `Inter`             | 400    | 0.75rem     |
| Price / code          | `JetBrains Mono`    | 500    | varies      |


Load via: `@fontsource/plus-jakarta-sans`, `@fontsource/inter`, `@fontsource/jetbrains-mono`

### Spacing & Border Radius

- Base unit: `4px`
- Cards: `rounded-xl` (12px)
- Modals / Sheets: `rounded-2xl` (16px) on top corners only when bottom-anchored
- Buttons: `rounded-lg` (8px)
- Badges: `rounded-full`
- Image containers: `rounded-xl`

### Component Design Language

- **Cards:** dark surface (`var(--card)`) with `1px border` in `var(--border)`, subtle shadow `0 2px 12px oklch(0 0 0 / 0.4)`
- **Buttons (primary):** amber background, dark text, hover darkens by 10%, active scales to 0.97
- **Buttons (ghost):** transparent, border on hover, amber text for links
- **Inputs:** dark background, amber focus ring, bottom-border-only style for clean look
- **Badges:** small pill shapes. Available=emerald, Booked=red, Event=amber, Category=varied
- **Bottom Navigation (mobile):** fixed bottom bar with 4–5 icons, active icon in amber

### Motion Principles (Inspired by TIX.ID + Framer Motion)

- Page transitions: `slide-up` (200ms ease-out)
- Sheet / Drawer open: `slide-up` from bottom on mobile (350ms spring)
- Card hover: `translateY(-2px)` + shadow increase (150ms)
- Status change (table color): smooth color transition (300ms)
- Skeleton → content: `fade-in` (200ms)
- Toast notifications: slide-in from top-right (250ms)

---

---

## CUSTOMER PAGES

---

## Page 1 — Homepage (`/`)

**Purpose:** First impression. Showcases upcoming events + introduces the two main CTAs (Reserve Table & Explore Events). This is the "cinema lobby" of the app.

**Inspired by:** TIX.ID homepage (prominent search/discovery, event cards with cover images, clean hierarchy) + Eveno event app

### Layout (Desktop — 1280px)

```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR                                                   │
│  [☕ Campus Cafe logo]    [Events] [Reserve] [🔔] [Avatar]│
└──────────────────────────────────────────────────────────┘
│                                                           │
│  HERO SECTION (full-width, ~60vh)                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Background: blurred cafe photo, dark overlay 60%   │ │
│  │                                                     │ │
│  │  [Kategori badge: "Event Minggu Ini"]               │ │
│  │  HEADLINE: "Nongkrong Seru,                         │ │
│  │             Lebih Dari Sekadar Kopi."               │ │
│  │  Subtext: "Reservasi meja, lihat event mendatang,   │ │
│  │            pesan makanan — semua dari satu tempat." │ │
│  │                                                     │ │
│  │  [🗓 Lihat Semua Event] [⬛ Reservasi Meja →]        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  EVENTS SECTION                                           │
│  "Event Mendatang" ────────────────────── [Lihat Semua →]│
│                                                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ cover   │ │ cover   │ │ cover   │ │ cover   │        │
│  │ image   │ │ image   │ │ image   │ │ FULL    │        │
│  │ [badge] │ │ [badge] │ │ [badge] │ │         │        │
│  │ Title   │ │ Title   │ │ Title   │ │         │        │
│  │ Date    │ │ Date    │ │ Date    │ │         │        │
│  │ Detail→ │ │ Detail→ │ │ Detail→ │ │         │        │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                           │
│  ABOUT / LOCATION SECTION (static)                        │
│  "Tentang Campus Cafe" — address, hours, social links     │
│                                                           │
│  FOOTER                                                   │
└──────────────────────────────────────────────────────────┘
```

### Layout (Mobile — 375px)

```
┌──────────────────┐
│ ☕ Campus Cafe 🔔│  ← minimal top bar
├──────────────────┤
│   HERO (100vw)   │
│   short version  │
│   headline 2 ln  │
│ [Event] [Reserve]│
├──────────────────┤
│ Event Mendatang  │
│ ────────────────>│  ← horizontal scroll
│ [card][card][+] >│
├──────────────────┤
│   About section  │
├──────────────────┤
│ BOTTOM NAV BAR   │
│ 🏠  🎪  📋  👤  │
└──────────────────┘
```

### Component Details

**Navbar:**

- Dark surface `var(--card)`, bottom border `var(--border)`
- Logo: coffee cup icon + "Campus Cafe" text in `Plus Jakarta Sans 600`
- Nav links: ghost style, hover amber underline
- CTA "Reservasi Meja": amber filled pill button
- Avatar: circular, opens dropdown (My Reservations, My Orders, Profile, Sign Out)
- Notification bell: with red dot badge if unread

**Hero Section:**

- Full-width photo with `bg-cover bg-center`
- Dark gradient overlay: `linear-gradient(to bottom, rgba(16,15,8,0.5), rgba(16,15,8,0.9))`
- Category badge: amber pill `"🎉 3 Event Minggu Ini"`
- Headline: `Plus Jakarta Sans 700`, 3.5rem desktop / 2rem mobile, warm white
- Subtext: `Inter 400`, 1.1rem, `--muted-foreground`
- Two CTA buttons: primary amber + ghost outline

**Event Card:**

- Size: `280px × 340px` desktop, `240px × 300px` mobile
- Cover image: top 55% of card, `object-cover`, `rounded-t-xl`
- Content area: `var(--card)` background
- Category badge: top-left overlay on image, colored by type:
  - Nobar → `bg-blue-600`
  - Workshop → `bg-violet-600`
  - Meetup → `bg-emerald-600`
  - Other → `bg-amber-600`
- Title: `Plus Jakarta Sans 600`, 2 lines max, white
- Date: `Inter 400`, small, `--muted-foreground`, with calendar icon; optional pill **"Berlangsung"** when `now` is between start and end
- Footer line: subtle text + icon, e.g. "Info lengkap di halaman event" (card navigates to in-app `/events/:id`, not directly to external URL — keeps one consistent detail page)
- Hover: card lifts 4px, subtle amber glow on border

**Bottom Navigation (mobile only):**

- Fixed bottom, `var(--card)` background, top border
- 4 items: Beranda (🏠), Event (🎪), Pesanan (📋), Profil (👤)
- Active icon: amber filled, label shown
- Inactive: muted gray, no label

---

## Page 2 — Sign In (`/sign-in`)

**Purpose:** Authentication entry. Simple, minimal friction.

### Layout

```
┌──────────────────────────────────────┐
│  ← Back                              │
│                                      │
│     ☕  Campus Cafe                  │
│     Masuk ke akun kamu               │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [G] Masuk dengan Google       │  │  ← prominent, top
│  └────────────────────────────────┘  │
│                                      │
│  ─────────── atau ────────────       │
│                                      │
│  Email                               │
│  ┌────────────────────────────────┐  │
│  │ email@domain.com               │  │
│  └────────────────────────────────┘  │
│                                      │
│  Password                            │
│  ┌──────────────────────────────👁│  │
│  │ ••••••••                       │  │
│  └────────────────────────────────┘  │
│              Lupa password?           │
│  ┌────────────────────────────────┐  │
│  │          Masuk                 │  │  ← amber filled
│  └────────────────────────────────┘  │
│                                      │
│  Belum punya akun? Daftar di sini   │
└──────────────────────────────────────┘
```

### Component Details

- Page: centered card `max-w-sm` on dark full-screen background
- Card: `var(--popover)` background, `rounded-2xl`, `p-8`
- Logo + title: centered, `Plus Jakarta Sans`
- Google button: white background (only light element on dark page), Google logo + text, full-width, `rounded-lg`
- Divider: `--border` color lines with "atau" text in `--muted-foreground`
- Inputs: bottom-border only style (`border-b border-input`), amber focus, no outer border ring
- "Lupa password?" right-aligned, small amber link text
- Submit: full-width amber button
- Sign up link: centered footer text

---

## Page 3 — Sign Up (`/sign-up`)

Same card layout as Sign In. Additional fields:

- Nama Lengkap (text input)
- Email
- Password + Confirm Password (with strength indicator: 3 dots, amber when strong)
- No phone number here (added in Profile later)

After submit: show "Cek emailmu" confirmation screen (amber envelope icon + instructional text).

---

## Page 4 — Floor Plan / Reserve (`/reserve`)

**Purpose:** Core reservation flow. Customer browses the interactive cafe floor plan and selects a table. Inspired by **TIX.ID cinema seat picker** adapted for a cafe layout.

### Layout (Desktop)

```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR                                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  "Pilih Meja"        [Zone tabs: Semua | Indoor | Outdoor | VIP]  │
│                                                           │
│  ┌──────────────────────────────────────────┐ ┌────────┐ │
│  │                                          │ │LEGEND  │ │
│  │          CAFE FLOOR PLAN (SVG)           │ │● Avail │ │
│  │                                          │ │● Booked│ │
│  │  [M1] [M2] [M3]                         │ │        │ │
│  │                                          │ │        │ │
│  │         [M4]  [M5]                       │ │INFO    │ │
│  │  ━━━━ Bar ━━━━━━━━━━━━━━                │ │Klik meja│ │
│  │  [B1] [B2] [B3]    [O1] [O2]  ← outdoor│ │hijau utk│ │
│  │                                          │ │reservasi│ │
│  │  [V1 VIP] [V2 VIP]                       │ │        │ │
│  └──────────────────────────────────────────┘ └────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Layout (Mobile — 375px)

```
┌──────────────────┐
│ ← Pilih Meja     │
├──────────────────┤
│[All][In][Out][VIP│  ← scrollable tabs
├──────────────────┤
│                  │
│   FLOOR PLAN     │
│  (scrollable     │
│   horizontal)    │
│                  │
├──────────────────┤
│ ● Tersedia  ● Terisi │  ← legend at bottom
│ Ketuk meja hijau     │
└──────────────────┘
```

### Floor Plan SVG Design

- Canvas: `860px × 520px` (desktop), scales down proportionally on mobile
- Background: slightly lighter than page bg (`--card`) with faint grid lines
- Zone labels: dimmed amber text, uppercase small caps
- **Available table:**
  - Shape: rounded rectangle 60×40px
  - Fill: `rgba(52, 211, 153, 0.15)` (translucent emerald)
  - Border: `2px solid #34D399` (emerald)
  - Center: table number in white, small capacity badge below
  - Hover: fill darkens to `rgba(52, 211, 153, 0.3)`, cursor pointer, shows tooltip "Meja M1 — 4 kursi"
  - Click: triggers amber pulse ring animation, opens Reservation Form Sheet
- **Booked/Occupied table:**
  - Fill: `rgba(248, 113, 113, 0.12)` (translucent red)
  - Border: `2px solid #F87171` (red)
  - Center: table number, lock icon below
  - Hover: tooltip "Terisi"
  - Cursor: not-allowed
- **Inactive table:** hidden
- Decorative elements: bar counter (amber line), entrance label, zone boundary lines (dashed, `--border`)

---

## Page 5 — Reservation Form Sheet (Slide-over)

**Trigger:** Clicking an available table on the floor plan.
**Component type:** `Sheet` (shadcn/ui) — slides in from the right on desktop, from bottom on mobile.

### Layout

```
Desktop (right side sheet, 420px wide):    Mobile (bottom sheet, full-width):
┌──────────────────────────────┐           ┌──────────────────┐
│  ← [X]  Reservasi Meja       │           │    ▬▬ (handle)   │
│  ─────────────────────────── │           │  Reservasi Meja  │
│  🪑 Meja M1 — Indoor         │           │ 🪑 Meja M1       │
│  Kapasitas: 4 orang          │           │ Indoor, 4 orang  │
│  ─────────────────────────── │           │ ─────────────    │
│                               │           │  Pilih Tanggal   │
│  Pilih Tanggal                │           │  [Selasa 22 Apr] │
│  ┌──────────────────────────┐ │           │                  │
│  │  Selasa, 22 April 2026   │ │           │  Jam Mulai       │
│  └──────────────────────────┘ │           │  [segmented]     │
│                               │           │                  │
│  Jam Mulai                    │           │  Durasi          │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │           │  [1j][2j][3j]   │
│  │10│ │11│ │12│ │13│ │14│...│           │                  │
│  └──┘ └──┘ └──┘ └──┘ └──┘   │           │  Jumlah Tamu     │
│                               │           │  - [2] +         │
│  Durasi                       │           │                  │
│  ┌───────┐ ┌───────┐ ┌──────┐│           │  Kebijakan refund │
│  │ 1 Jam │ │ 2 Jam │ │ 3 Jam││           │  ───────────     │
│  └───────┘ └───────┘ └──────┘│           │ [Bayar Rp 25.000]│
│                               │           └──────────────────┘
│  Jumlah Tamu                  │
│  ─────────────────────        │
│  - [  2  ] +                  │
│                               │
│  📋 Kebijakan Pembatalan       │
│  Pembatalan min. 2 jam sebelum│
│  Refund 1-3 hari kerja.       │
│                               │
│  ┌──────────────────────────┐ │
│  │  Bayar Sekarang          │ │  ← amber, full width
│  │  Rp 25.000               │ │
│  └──────────────────────────┘ │
└──────────────────────────────┘
```

### Component Details

- **Date picker:** horizontal scrollable date strip (Mon–Sun for next 7 days). Selected date: amber background pill
- **Time picker:** horizontal scrollable hour chips (10:00, 11:00 ... 22:00). Selected: amber fill. Past times: dimmed, disabled
- **Duration:** 3-way segmented control button. Selected segment: amber fill, others: ghost
- **Guest count:** `−` button + number display + `+` button. Max = table capacity (validated inline, shows "Melebihi kapasitas" if exceeded in red)
- **Price:** shown dynamically (e.g., Rp 25.000 for 2 hours — configurable by admin)
- **CTA:** amber full-width button. State changes: loading spinner while creating payment link, then redirects to Mayar.id
- **Error state:** if table just became booked while form is open → toast "Meja ini baru saja dipesan. Silakan pilih meja lain." + sheet closes and highlights the conflict

---

## Page 6 — Booking Confirmation (`/my-reservations?success=true`)

**Purpose:** Post-payment success screen. User sees immediately that the booking is confirmed.

### Layout (overlay state on My Reservations)

```
┌────────────────────────────┐
│                            │
│      ✅ (animated check)   │
│                            │
│   Reservasi Dikonfirmasi!  │
│                            │
│   Meja M1 — Indoor        │
│   Selasa, 22 April 2026   │
│   11:00 – 13:00 (2 jam)  │
│   2 tamu                  │
│                            │
│   Kode Konfirmasi:         │
│   ┌────────────────────┐  │
│   │  ABC-XY12          │  │  ← monospace, amber
│   └────────────────────┘  │
│                            │
│ [Lihat Reservasiku]       │
│ [Reservasi Meja Lain]     │
└────────────────────────────┘
```

- Success animation: green checkmark with circular sweep animation (200ms)
- Confirmation code: `JetBrains Mono` on dark surface card, amber color, letter-spaced
- Two buttons: primary (My Reservations) + ghost (Reserve Another)

---

## Page 7 — My Reservations (`/my-reservations`)

**Purpose:** Customer manages their bookings. Inspired by TIX.ID's "My Tickets" screen.

### Layout

```
┌──────────────────┐
│ ← My Reservations│
├──────────────────┤
│ [Mendatang] [Lalu]│  ← 2 tabs
├──────────────────┤
│                  │
│ ┌──────────────┐ │
│ │ CONFIRMED  ✓ │ │  ← status badge (top-right of card)
│ │              │ │
│ │ 🪑 Meja M1   │ │
│ │    Indoor    │ │
│ │              │ │
│ │ 📅 Selasa, 22 Apr│
│ │ ⏰ 11:00 – 13:00 │
│ │ 👥 2 tamu        │
│ │              │ │
│ │ Kode: ABC-XY12   │  ← monospace, amber
│ │              │ │
│ │ [Batalkan]   │ │  ← ghost button, small, destructive color
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │ PENDING ⏳   │ │
│ │ ...          │ │
│ └──────────────┘ │
│                  │
│ ─── Tab: Lalu ─── │
│ ┌──────────────┐ │
│ │ CANCELLED    │ │
│ │  opacity:60% │ │  ← greyed out
│ └──────────────┘ │
└──────────────────┘
```

### Component Details

- **Status badges:**
  - Confirmed: `bg-emerald-900 text-emerald-400`
  - Pending: `bg-amber-900 text-amber-400`
  - Cancelled: `bg-neutral-800 text-neutral-400`
- **Reservation card:** `var(--card)`, left border `4px` colored by status
- **Confirmation code:** small monospace text in amber, with copy-to-clipboard icon
- **Cancel button:** ghost, small, `text-destructive`. Click → opens `AlertDialog`:
  - Title: "Batalkan Reservasi?"
  - Body: "Refund akan diproses dalam 1–3 hari kerja setelah pembatalan dikonfirmasi."
  - Actions: "Batalkan Reservasi" (destructive, filled) + "Batal" (ghost)
- **Cancelled tab:** cards appear at 60% opacity, no action buttons
- **Empty state:** amber coffee cup illustration + "Belum ada reservasi. Yuk booking meja!"

---

## Page 8 — Event Detail (`/events/:id`)

**Purpose:** In-app **information page** for a single listing. Customers read the summary here; **signup, tickets, and payment happen on the official external page** (opened via primary CTA). Not a "checkout" screen.

### Layout (Desktop)

```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR                                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────┐ ┌──────────────────┐ │
│  │  COVER IMAGE (16:9, full-bleed)│ │  STICKY CARD     │ │
│  │  with dark gradient at bottom  │ │                  │ │
│  │  [Workshop badge]              │ │  Sabtu, 26 Apr   │ │
│  │  "UI Design Workshop           │ │  19:00 – 22:00   │ │
│  │   with Figma"                  │ │                  │ │
│  └────────────────────────────────┘ │  Link resmi:     │ │
│                                     │  event-foo.com…  │ │  ← truncated host
│  ─ DESKRIPSI ─────────────────────  │  (read-only)     │ │
│  Full rich text description...      │                  │ │
│  ─ DETAIL ─────────────────────────  │  ┌────────────┐  │ │
│  📅 Sabtu, 26 April 2026            │  │ Buka halaman│  │ │  ← amber, opens
│  ⏰ 19:00 – 22:00 WIB               │  │ resmi event │  │ │     externalUrl
│  📍 Campus Cafe, Bandung            │  └────────────┘  │ │     (new tab)
│  👤 Host: @username                  │                  │ │
│                                     │  Butuh meja?     │ │
│                                     │  [Reservasi meja]│ │ ← ghost → /reserve
│                                     └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Layout (Mobile)

```
┌──────────────────┐
│  COVER IMAGE     │
│  (full-width)    │
│  gradient overlay│
│  [Workshop]      │
│  Title here      │
├──────────────────┤
│  📅 26 Apr, 19:00│
│  👤 @host        │
│  ──────────────  │
│  Deskripsi...    │
│  ──────────────  │
│  Detail          │
├──────────────────┤
│  STICKY FOOTER   │
│ [Buka halaman resmi event →]│  ← single primary CTA
└──────────────────┘
```

### Component Details

- **Cover image:** `aspect-video`, `object-cover`, `rounded-xl` overflow hidden. Bottom: `linear-gradient(to top, rgba(16,15,8,1) 20%, transparent)`
- **Category badge:** colored by type, `rounded-full`, top-left of image
- **Sticky card (desktop):** `position: sticky`, `top: 80px`, `var(--card)` bg, amber border
- **Sticky footer (mobile):** fixed bottom bar with **one** primary CTA — no price, no seat bar, no ticket states
- **Primary CTA:** opens `externalUrl` in a **new tab** (`rel="noopener noreferrer"`). Label examples: "Buka halaman resmi event", "Daftar & info di penyelenggara". **No** login gate for viewing; auth not required to read this page.
- **Secondary CTA:** ghost button → `/reserve` (optional query `?date=…` prefill as nicety only)
- **Out of scope UI:** ticket price display, seats remaining, "Penuh", Mayar checkout, QR ticket, "Sudah terdaftar"

---

## Page 9 — QR Landing / In-Seat Menu (`/table/:tableId`)

**Purpose:** The primary ordering experience. Customer scans physical QR code on the table, lands here. Must load instantly. No auth wall — menu visible immediately.

**Inspired by:** Zomato/Swiggy in-restaurant ordering, dark-themed food apps

### Layout (Mobile First — this page is almost exclusively used on mobile)

```
┌──────────────────┐
│ ☕ Campus Cafe   │
│ 🪑 Meja M1       │  ← top bar: cafe name + table label
│    Indoor • 4 org│
├──────────────────┤
│ [Semua][Makanan][Minuman][Snack] │  ← horizontal scrollable category tabs
├──────────────────┤
│                  │
│  ─ Minuman ─     │
│                  │
│ ┌──────────────┐ │
│ │  [photo 1:1] │ │
│ │  Kopi Susu   │ │
│ │  Espresso... │ │  ← 1-2 line description
│ │  Rp 25.000   │ │
│ │           [+]│ │  ← amber add button
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │  [photo 1:1] │ │
│ │  Matcha Latte│ │
│ │  Rp 30.000   │ │
│ │   HABIS      │ │  ← grayed out, "HABIS" badge
│ └──────────────┘ │
│                  │
│  ─ Makanan ─     │
│  ...             │
│                  │
│ ┌──────────────┐ │  ← floating cart button (if items added)
│ │ 🛒 2 item    │ │
│ │ Rp 55.000  > │ │
└──────────────────┘
```

### Component Details

- **Top bar:** compact, no full navbar. Just cafe logo + table info. Sticky on scroll
- **Category tabs:** horizontal scrollable, no scrollbar visible. Active tab: amber underline + text
- **Menu item card (list style):**
  - Layout: horizontal — photo left `80×80px` square, content right
  - Photo: `rounded-lg`, `object-cover`
  - Name: `Inter 500`, white
  - Description: 2 lines max, `--muted-foreground`, small
  - Price: `JetBrains Mono`, amber color
  - Add button: small amber circle `+` button, right-aligned
  - If in cart: replaces `+` with `−[qty]+` stepper
  - If sold out: card opacity 60%, photo has "HABIS" badge overlay (small red pill)
- **Category section headers:** `Plus Jakarta Sans 600`, amber underline-left
- **Floating cart button:**
  - Fixed bottom, above bottom safe area
  - Appears when cart has ≥ 1 item
  - Full-width pill: "🛒 2 item · Rp 55.000 →"
  - Amber background, springs up with animation
- **Auth gate:**
  - If not logged in, add button → opens `Sheet` from bottom
  - Sheet title: "Masuk untuk memesan"
  - Shows Google login button + email option
  - After auth: returns to same page, item added

---

## Page 10 — Cart & Order Placement (Bottom Sheet)

**Trigger:** Tapping the floating cart button.

```
┌──────────────────┐
│    ▬▬ (handle)   │
│  Pesanan Kamu    │
│  Meja M1         │
├──────────────────┤
│                  │
│ Kopi Susu     ×1 │
│ Rp 25.000    [─][1][+] │
│                  │
│ Nasi Goreng   ×1 │
│ Rp 35.000    [─][1][+] │
│                  │
│ ────────────     │
│ Subtotal: Rp 60.000 │
│                  │
│ [Pesan Sekarang] │  ← amber, full-width
└──────────────────┘
```

- Sheet: bottom-anchored, rounded top corners `rounded-t-2xl`
- Drag handle at top
- Item rows: name + qty stepper + price per line
- Quantity stepper: `−` gray, number centered, `+` amber
- Swipe left on item → delete icon appears (red trash)
- Subtotal: right-aligned, `JetBrains Mono`, white, bold
- "Pesan Sekarang" button: amber, full-width
- After placing order: sheet closes, active order status bar appears at top of table page

---

## Page 11 — My Orders / Order Status (`/my-orders`)

**Purpose:** Customer tracks their active and past food orders.

### Layout

```
┌──────────────────┐
│ ← Pesananku      │
├──────────────────┤
│  AKTIF           │
│ ┌──────────────┐ │
│ │ Order #AB12  │ │
│ │ Meja M1      │ │
│ │              │ │
│ │ ●─────○──○   │ │
│ │ Diterima  Siap│ │  ← progress stepper
│ │          Proses│ │
│ │              │ │
│ │ Kopi Susu ×1 │ │
│ │ Nasi Goreng ×1│ │
│ │ Total: Rp 60K │ │
│ └──────────────┘ │
│                  │
│  RIWAYAT         │
│ ┌──────────────┐ │
│ │ Order #AB08  │ │
│ │ ✅ Selesai   │ │
│ │ Rp 45.000    │ │
│ │ 3 hari lalu  │ │
│ └──────────────┘ │
└──────────────────┘
```

### Order Status Stepper

3-step horizontal stepper:

1. **Diterima** (Pending) — step dot: filled amber
2. **Diproses** (Preparing) — step dot: amber when active, gray when not yet
3. **Siap Diambil** (Ready) — step dot: green when reached

Current step: amber animated pulse on the dot
Connecting lines: fill left-to-right as order progresses

Status updates in real time (Convex reactive). When status changes to "Siap": toast notification "Pesananmu siap diambil! 🎉" + gentle vibration (mobile).

---

## Page 12 — Profile (`/profile`)

### Layout

```
┌──────────────────┐
│ ← Profil         │
├──────────────────┤
│                  │
│  ┌───────────┐   │
│  │   AVATAR  │   │  ← circle, 80px, tap to upload
│  │   [edit]  │   │
│  └───────────┘   │
│  Nama: Ahmad     │
│  ──────────────  │
│                  │
│  Nama Lengkap    │
│  [Ahmad Faris  ] │
│                  │
│  Nomor HP        │
│  [+62 812...]    │
│                  │
│  Email           │
│  ahmad@gmail.com │  ← read-only (from auth)
│                  │
│  [Simpan]        │  ← amber
│  ──────────────  │
│  Aktivitas Terkini│
│  📅 Meja M1 · 22 Apr│
│  🎪 Workshop · 26 Apr│
│  📅 Meja M3 · 18 Apr│
│  ──────────────  │
│  [Keluar]        │  ← ghost, destructive
└──────────────────┘
```

---

---

## STAFF PAGES

> Staff pages use the **Staff Layout** (dark sidebar, narrower nav).
> Color scheme same as customer, but interface is more data-dense.

---

## Page 13 — Staff: Live Reservation Operations Board (`/staff/reservations`)

**Purpose:** Staff's primary work screen. Shows all tables live, can release them. The "control center."

### Layout (Desktop)

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  HEADER: "Operasional Meja"   [Floor] [List]   │
│ ─────── │  ─────────────────────────────────────────────  │
│ 🏠 Dashboard│                                              │
│ 🪑 Reservasi│   ══ Indoor ══════════════════════════      │
│ 🍽 Pesanan  │                                              │
│ 📋 Menu     │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│          │   │ M1  │ │ M2  │ │ M3  │ │ M4  │          │
│          │   │● OK │ │●BOOK│ │●OCC │ │● OK │          │
│          │   │4 org│ │Ahmed│ │  ←  │ │     │          │
│          │   │     │ │11-13│ │Faris│ │     │          │
│          │   └─────┘ └─────┘ └─────┘ └─────┘          │
│          │                                              │
│          │   ══ Outdoor ═══════════════════════════     │
│          │   ┌─────┐ ┌─────┐                           │
│          │   │ O1  │ │ O2  │                           │
│          │   │●BOOK│ │● OK │                           │
│          │   │Budi │ │     │                           │
│          │   │12-14│ │     │                           │
│          │   └─────┘ └─────┘                           │
│          │                                              │
│          │  Selected table panel (right, if table clicked)│
│          │  ┌─────────────────────┐                    │
│          │  │ Meja M2 — Indoor    │                    │
│          │  │ Status: BOOKED      │                    │
│          │  │ Customer: Ahmed     │                    │
│          │  │ 11:00–13:00, 3 org  │                    │
│          │  │ Kode: ABC-XY12      │                    │
│          │  │ [Tandai Occupied]   │                    │
│          │  │ [Release ke Available]│                  │
│          │  └─────────────────────┘                    │
└──────────┴────────────────────────────────────────────────┘
```

### Table Card Design (Staff View)

Staff table cards are larger than customer view, with more info:

- `120×90px` rounded rectangle
- Status indicator: solid color-coded border (4px) + background tint
- Top: table label (large, white)
- Middle: customer name (if booked) or "— Kosong —"
- Bottom: time slot (if booked)
- **Available:** `border-emerald-500` + green bottom line
- **Booked:** `border-amber-500` + amber, customer name shown
- **Occupied:** `border-red-500` + red, customer name shown
- Hover: highlight + tooltip showing quick-action buttons

### Table Detail Side Panel

When clicking a table card: right-side panel slides in (or modal on small screens):

- Full booking details
- "Tandai Occupied" button (amber) — changes Booked → Occupied
- "Release ke Available" button (green, with confirm dialog) — any status → Available
- Confirm dialog: "Yakin melepas Meja M2 ke status Available?" [Confirm] [Batal]

### List View (Tab Toggle)

Alternative to floor plan: sortable table with columns: Meja, Customer, Tanggal, Waktu, Tamu, Status, Actions

---

## Page 14 — Staff: Kitchen Order Queue (`/staff/orders`)

**Purpose:** Live kitchen display. Staff sees and manages all incoming food orders.

### Layout (Desktop — Kanban Style)

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  "Antrian Pesanan"    🔔 Notif baru   [History]│
│          │  ─────────────────────────────────────────────  │
│          │                                                  │
│          │  ┌───────────────┐ ┌───────────────┐ ┌────────┐│
│          │  │  DITERIMA (3) │ │  DIPROSES (2) │ │SIAP (1)││
│          │  │               │ │               │ │        ││
│          │  │ ┌───────────┐ │ │ ┌───────────┐ │ │┌──────┐││
│          │  │ │ #AB12     │ │ │ │ #AB10     │ │ ││ #AB08│││
│          │  │ │ Meja M1   │ │ │ │ Meja O2   │ │ ││ MejaM4│││
│          │  │ │ 2m ago    │ │ │ │ 8m ago    │ │ ││ 15m  │││
│          │  │ │ ─────── │ │ │ │ ─────── │ │ ││      │││
│          │  │ │ Kopi ×1   │ │ │ │ Jus ×2    │ │ ││Mie ×1│││
│          │  │ │ Nasi ×1   │ │ │ │ Snack ×1  │ │ ││      │││
│          │  │ │ ─────── │ │ │ │           │ │ ││      │││
│          │  │ │ [Proses →]│ │ │ │ [Siap →]  │ │ ││[Done]│││
│          │  │ └───────────┘ │ │ └───────────┘ │ │└──────┘││
│          │  │ ┌───────────┐ │ │               │ │        ││
│          │  │ │ #AB11     │ │ │               │ │        ││
│          │  │ │ NEW 🔴    │ │ │               │ │        ││  ← pulse dot on new
│          │  │ │ ...       │ │ │               │ │        ││
│          │  │ └───────────┘ │ │               │ │        ││
│          │  └───────────────┘ └───────────────┘ └────────┘│
└──────────┴────────────────────────────────────────────────┘
```

### Component Details

- **Column headers:** filled with count badge, e.g. `"DITERIMA (3)"`
  - Diterima: amber header
  - Diproses: blue header
  - Siap: green header
- **Order card:**
  - Order number: `#AB12` in `JetBrains Mono`, gray
  - Table label: prominent, white `Plus Jakarta Sans`
  - Time ago: small, `--muted-foreground`
  - Item list: compact bullet list
  - Action button: "Proses →" or "Siap →" or "Selesai" — full-width bottom of card
  - **NEW badge:** red pulsing dot on cards < 1 minute old
- **New order alert:** toast notification "Pesanan baru dari Meja M1!" + optional audio chime
- **Empty state:** illustrated empty tray with text "Tidak ada pesanan aktif"

---

## Page 15 — Staff/Admin: Menu Management (`/admin/menu` or `/staff/menu`)

### Layout (Desktop)

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  "Kelola Menu"                [+ Tambah Item]  │
│          │  ─────────────────────────────────────────────  │
│          │                                                  │
│          │  ┌─────────────┐ ┌────────────────────────────┐│
│          │  │ KATEGORI    │ │ ITEM: Minuman               ││
│          │  │             │ │                              ││
│          │  │ ☰ Minuman   │ │  ┌─────────────────────────┐││
│          │  │ ☰ Makanan   │ │  │ [img] Kopi Susu  Rp25k  │││
│          │  │ ☰ Snack     │ │  │       Tersedia  ●  [Edit]│││  ← toggle switch
│          │  │             │ │  └─────────────────────────┘││
│          │  │ [+Kategori] │ │  ┌─────────────────────────┐││
│          │  │             │ │  │ [img] Matcha Latte Rp30k│││
│          │  │             │ │  │       HABIS     ○  [Edit]│││
│          │  │             │ │  └─────────────────────────┘││
│          │  │             │ │                              ││
│          │  │             │ │  [Tandai Semua Habis]        ││  ← bulk action
│          │  └─────────────┘ └────────────────────────────┘│
└──────────┴────────────────────────────────────────────────┘
```

### Component Details

- **Category list:** draggable rows (drag handle icon ☰), click to select
- **Item row:** horizontal, `var(--card)`, hover reveals edit/delete
- **Availability toggle:** shadcn `Switch` — green when available, grays out when unavailable
- **Bulk toggle:** ghost button "Tandai Semua Habis" per category, confirmation required
- **Add/Edit item drawer:** right-side drawer with form fields: name, description, price, category, image upload area (dashed border upload zone), availability toggle

---

---

## ADMIN PAGES

> Admin pages use the **Admin Layout** — wider sidebar, more navigation items, notification bell in header.

---

## Page 16 — Admin: Analytics Dashboard (`/admin/dashboard`)

**Purpose:** Owner's command center. Real-time business overview.

### Layout (Desktop)

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  "Dashboard"          Today: Selasa, 22 Apr   │
│ ───────  │  ─────────────────────────────────────────────  │
│ 📊 Dashbd│                                                  │
│ 🪑 Meja  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐│
│ 🎪 Event │  │ 📅        │ │ 🪑        │ │ 🍽        │ │ 💰 ││
│ 📋 Menu  │  │ Reservasi │ │ Meja     │ │ Pesanan  │ │Rev.││
│ 👥 Staff │  │ Hari Ini  │ │ Terisi   │ │ Aktif    │ │    ││
│ 💳 Bayar │  │   12      │ │  8/20    │ │   3      │ │850K││
│          │  │ +3 vs kem.│ │  (40%)   │ │          │ │    ││
│          │  └──────────┘ └──────────┘ └──────────┘ └────┘│
│          │                                                  │
│          │  ┌──────────────────────────────────┐           │
│          │  │  Tren Reservasi — 30 Hari        │           │
│          │  │  [Line chart, amber line]        │           │
│          │  │                                  │           │
│          │  └──────────────────────────────────┘           │
│          │                                                  │
│          │  ┌─────────────────┐ ┌─────────────────┐        │
│          │  │ Pesanan (tren)  │ │ (opsional)      │        │
│          │  │ [Area chart]    │ │ placeholder     │        │
│          │  └─────────────────┘ └─────────────────┘        │
└──────────┴────────────────────────────────────────────────┘
```

### Component Details

- **Stat cards:** `var(--card)`, amber icon (filled circle bg), large number in `Plus Jakarta Sans 700`, small comparison vs. yesterday below in green/red
- **Charts:** shadcn/ui Chart (Recharts wrapper)
  - Reservations: single amber line chart, smooth curve
  - Food Orders: area chart, teal fill (in-app events are listing-only — no attendee chart)
  - All charts: dark grid lines (`--border`), no box border, smooth hover tooltips
- **All data:** reactive via Convex, refreshes without manual action

---

## Page 17 — Admin: Table Layout Editor (`/admin/tables`)

### Layout (Desktop)

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  "Layout Meja"              [+ Tambah Meja]    │
│          │  ─────────────────────────────────────────────  │
│          │                                                  │
│          │  ┌──────────────────────────────────┐ ┌───────┐│
│          │  │     EDITOR FLOOR PLAN            │ │LIST   ││
│          │  │   (drag & drop, 800×500px)       │ │─────  ││
│          │  │                                  │ │M1 4org││
│          │  │  [M1]   [M2]   [M3]              │ │Aktif ●││
│          │  │                                  │ │[Edit] ││
│          │  │       [M4]    [M5]               │ │─────  ││
│          │  │  ━━ Bar ━━━━━━━━━━━━            │ │M2 4org││
│          │  │  [B1] [B2]   [O1] [O2]          │ │Aktif ●││
│          │  │                                  │ │[Edit] ││
│          │  │  [V1 VIP]  [V2 VIP]              │ │─────  ││
│          │  │                                  │ │       ││
│          │  │ Click table to select & edit     │ │       ││
│          │  └──────────────────────────────────┘ └───────┘│
└──────────┴────────────────────────────────────────────────┘
```

### Component Details

- **Selected table (in editor):** amber dashed border, resize handles at corners
- **Edit panel:** when table selected in editor, properties sidebar appears:
  - Label input, Zone dropdown, Capacity stepper, Active toggle
  - `[Simpan]` + `[Hapus]` buttons
- **Add table:** click "+ Tambah Meja" → form drawer → on save, new table appears in editor at default position
- **Drag behavior:** tables can be freely dragged on the canvas; position saved on drag-end

---

## Page 18 — Admin: Event Management (`/admin/events`)

### Layout

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  "Kelola Event"              [+ Buat Event]    │
│          │  ─────────────────────────────────────────────  │
│          │                                                  │
│          │  ┌─────────────────────────────────────────┐   │
│          │  │ [img] Workshop Design  │ PUBLISHED │ 26 Apr  │
│          │  │       event-foo.com…             [⋯] │  │
│          │  ├─────────────────────────────────────────┤   │
│          │  │ [img] Nobar Champions  │ DRAFT    │ 30 Apr  │
│          │  │       (belum ada link)           [⋯] │  │
│          │  ├─────────────────────────────────────────┤   │
│          │  │ [img] Meetup Startup   │ PUBLISHED │ 15 May  │
│          │  │       luma.com/…               [⋯] │  │
│          │  └─────────────────────────────────────────┘   │
└──────────┴────────────────────────────────────────────────┘
```

### Create/Edit Event Drawer (full-height right-side drawer)

```
┌──────────────────────────────┐
│ [X]  Buat Event Baru         │
│ ─────────────────────────── │
│ Judul Event                  │
│ [________________________]   │
│                               │
│ Kategori   ▼                  │
│ [Nobar    ]                   │
│                               │
│ Cover Image                   │
│ ┌──────────────────────────┐ │
│ │  📁 Upload atau drag     │ │  ← dashed border upload zone
│ │     gambar di sini       │ │
│ └──────────────────────────┘ │
│                               │
│ Tanggal & Waktu               │
│ Mulai: [22 Apr] [19:00]       │
│ Selesai: [22 Apr] [22:00]     │
│                               │
│ Link halaman resmi event *    │
│ [https://________________]    │
│                               │
│ Deskripsi (rich text editor)  │
│ ┌──────────────────────────┐ │
│ │ B I U — • • •           │ │
│ │ ...                      │ │
│ └──────────────────────────┘ │
│                               │
│ Status: [● Draft] [○ Published]│
│                               │
│ [Simpan Draft]  [Publish →]   │
└──────────────────────────────┘
```

> **Admin note:** There is **no** in-app attendees list, CSV export, or reminder blast — registration happens on the external platform. Validate that **Link halaman resmi event** is a well-formed `https://` URL before publish.

---

## Page 19 — Admin: Staff Management (`/admin/staff`)

### Layout

```
┌──────────┬────────────────────────────────────────────────┐
│ SIDEBAR  │  "Kelola Staff"              [+ Undang Staff]  │
│          │  ─────────────────────────────────────────────  │
│          │                                                  │
│          │  ┌─────────────────────────────────────────────┐│
│          │  │ [av] Ahmad Faris   admin@gmail.com  ADMIN   ││  ← you (grayed, no revoke)
│          │  ├─────────────────────────────────────────────┤│
│          │  │ [av] Budi Staff    budi@gmail.com   STAFF  ▼││  ← role dropdown
│          │  │                                    [Cabut Akses]││
│          │  ├─────────────────────────────────────────────┤│
│          │  │ [av] Citra Staff   citra@gmail.com  STAFF  ▼││
│          │  │                                    [Cabut Akses]││
│          │  └─────────────────────────────────────────────┘│
│          │                                                  │
│          │  Undang Staff                                   │
│          │  ┌──────────────────────────────┐ [Kirim Undangan]│
│          │  │  email@staff.com             │              │
│          │  └──────────────────────────────┘              │
└──────────┴────────────────────────────────────────────────┘
```

---

---

## Shared Components Specification

### Notification Bell (Admin/Staff)

- Icon: bell outline, top navbar
- Unread badge: small red pill with count
- Dropdown (click): `Popover` component, max-height scroll, each item:
  - Icon by type + title + timestamp + "baca" status
  - Cancellation refund items: orange border-left, bold title
- "Tandai semua dibaca" link at bottom

### Toast Notifications

- Position: top-right (desktop), top-center (mobile)
- Types:
  - Success: green left border, check icon
  - Error: red left border, X icon
  - Info: amber left border, info icon
- Auto-dismiss: 4 seconds
- Max 3 stacked

### Empty States

Consistent illustration style: simple line-art icon (monochrome amber tint) + headline + subtext + optional CTA button.

Examples:

- No reservations: `🪑` icon, "Belum ada reservasi"
- No events: `🎪` icon, "Tidak ada event mendatang"
- No orders: `🍽` icon, "Tidak ada pesanan aktif"

### Loading States

- **Data loading:** `Skeleton` component in `--muted` color with shimmer animation
- **Button loading:** button text hidden, spinner in center, button still full-width
- **Page transition:** `opacity: 0 → 1` fade (150ms)

### Confirmation Dialogs (`AlertDialog`)

- Dark overlay: `rgba(16,15,8,0.8)` backdrop
- Dialog card: `var(--popover)`, `rounded-2xl`, `p-6`
- Destructive action button: `bg-red-600` (not amber) to differentiate from normal actions
- Always has a "Batal" (cancel) ghost button

---

## Responsive Breakpoints Summary


| Page            | Mobile (375px)                                        | Tablet (768px)       | Desktop (1280px)          |
| --------------- | ----------------------------------------------------- | -------------------- | ------------------------- |
| Homepage        | Bottom nav, stacked sections, horizontal event scroll | 2-col event grid     | 4-col event grid + navbar |
| Floor Plan      | Horizontal-scroll SVG in overflow container           | Full SVG, no sidebar | Full SVG + legend sidebar |
| Event Detail    | Sticky bottom: **external** official-page CTA          | Sidebar card + CTA   | Full sidebar + CTA        |
| QR / Menu       | Full-screen menu, floating cart                       | 2-col menu grid      | 3-col menu grid (max-w)   |
| Staff Orders    | Vertical stack of columns                             | 2 columns visible    | 3-column Kanban           |
| Admin Dashboard | Stacked stat cards + charts                           | 2×2 grid             | 4-col stat row + 2 charts |
| Admin Tables    | List-only view (editor collapsed)                     | Editor full-width    | Editor + sidebar list     |


---

## Reference Links Used in This Design

1. **TIX.ID Redesign Case Study** (UX inspiration): cinema seat selection → table floor plan metaphor, bottom tab nav, clear CTA hierarchy
2. **Eveno — Event Booking App UI Kit** (Behance): dark event app aesthetic, 180+ screens
3. **Restaurant Reservation App UI Kit** (Insightlancer/Behance): booking flow, order / “my bookings” patterns (not in-app event tickets)
4. **TOMATO Food Ordering App** (Medium Case Study): card-based menu, bottom navigation, order status stepper
5. **Trena — Food Ordering Dark Mode App** (Envato): dark mode food app visual style
6. **shadcn/ui theming docs**: CSS custom properties, OKLCH color system, sidebar theming

---

*Design spec owner: Development Team*
*Generated for: AI UI Prototype Agent*
*Last updated: April 17, 2026 — Events: listing/info-only with outbound official link; removed ticketing/registration/attendees UI from spec.*