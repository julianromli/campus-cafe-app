# Campus Cafe — catatan cepat

## Langkah berikutnya

1. `cd campus-cafe`
2. `bun run dev:setup` — mengarahkan setup proyek Convex
3. Salin variabel lingkungan dari `packages/backend/.env.local` ke `apps/*/.env`
4. `bun run dev`

Setelah jalan, aplikasi:

- **Frontend:** [http://localhost:5173](http://localhost:5173)

## Lint & format

- `bun run check` — format + perbaikan lint

## Deploy web (Cloudflare / Alchemy)

Jalankan dari `apps/web`:

- Dev: `bun run alchemy dev`
- Deploy: `bun run deploy`
- Hapus stack: `bun run destroy`

Contoh dengan `cd`:

```bash
cd apps/web && bun run alchemy dev
```

## Better Auth + Convex

Set env di Convex dari folder backend:

```bash
cd packages/backend
bun convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
bun convex env set SITE_URL http://localhost:5173
```

> Di Windows PowerShell, `$(openssl ...)` bisa diganti dengan nilai secret manual atau perintah setara untuk menghasilkan string acak.

## Email (Resend) — Convex

Dari folder `packages/backend`, set variabel lingkungan deployment Convex:

```bash
bun convex env set RESEND_API_KEY re_...
bun convex env set EMAIL_FROM_ADDRESS "Campus Cafe <onboarding@resend.dev>"
# Opsional — default mengirim hanya ke alamat uji Resend; set ke false setelah domain terverifikasi:
bun convex env set RESEND_TEST_MODE false
# Opsional — untuk webhook event email Resend nanti:
# bun convex env set RESEND_WEBHOOK_SECRET ...
```

`SITE_URL` dipakai untuk link “Lihat reservasiku” di email konfirmasi.

## Mayar.id (pembayaran)

Set di Convex (`packages/backend`):

- `MAYAR_API_KEY` — wajib untuk membuat link pembayaran dan polling status transaksi (admin **Sync Status**).
- `MAYAR_WEBHOOK_SECRET` — **wajib di production**; webhook menolak request jika env ini tidak diset. Nilai harus cocok persis dengan header `x-mayar-webhook-secret` / `x-webhook-secret` / `Authorization: Bearer …` yang dikirim Mayar.
- `MAYAR_PAYMENT_CREATE_URL` — opsional; override endpoint **create** (default: `https://api.mayar.id/hl/v1/payment/create`).
- `MAYAR_TRANSACTIONS_URL` — opsional; override endpoint **daftar transaksi** untuk sinkron manual (default: `https://api.mayar.id/hl/v1/transactions`).

## Harga reservasi

Set di Convex (`packages/backend`):

- `RESERVATION_PRICE_PER_HOUR` — **wajib**; harga per jam reservasi dalam IDR (bilangan bulat). Dipakai oleh `payments.createReservationPaymentLink` untuk menghitung total = `durationHours × RESERVATION_PRICE_PER_HOUR`.

## Reservation hold (auto-expire)

Setelah customer klik *Reservasi* dan sebelum selesai membayar di Mayar, slot di-hold sebagai `pending` dan juga mem-blok pengguna lain untuk slot/waktu yang sama. Jika pembayaran tidak selesai dalam **30 menit**, reservasi otomatis dibatalkan oleh `internal.reservations.expirePendingReservation` (dijadwalkan via `ctx.scheduler.runAfter`). Customer yang terkena expiry dapat mencoba membooking ulang.

## Environment — Frontend (`apps/web/.env`)

Web app memakai Vite, jadi variabel **harus** diawali `VITE_`:

- `VITE_CONVEX_URL` — URL Convex deployment (mis. `https://<dep>.convex.cloud`). Wajib.
- `VITE_CONVEX_SITE_URL` — origin Convex HTTP actions (`https://<dep>.convex.site`). Wajib untuk auth client + webhook URL yang di-share ke Mayar.
- `VITE_GOOGLE_CLIENT_ID` — opsional; mengaktifkan tombol sign-in Google di `/sign-in`.

Salin dari `packages/backend/.env.local` (output `bun run dev:setup`) ke `apps/web/.env` untuk `VITE_CONVEX_URL` dan `VITE_CONVEX_SITE_URL`.

## Environment — Better-Auth server

Set di Convex (`packages/backend`):

- `BETTER_AUTH_SECRET` — wajib; random 32+ byte base64.
- `SITE_URL` — origin web app (mis. `http://localhost:5173` di dev, domain produksi di prod). Dipakai untuk trusted origins, redirect email, dan link "Lihat reservasiku" di template email.

