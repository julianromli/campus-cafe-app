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
- `MAYAR_WEBHOOK_SECRET` — opsional; jika diset, webhook menolak request tanpa header secret yang cocok.
- `MAYAR_PAYMENT_CREATE_URL` — opsional; override endpoint **create** (default: `https://api.mayar.id/hl/v1/payment/create`).
- `MAYAR_TRANSACTIONS_URL` — opsional; override endpoint **daftar transaksi** untuk sinkron manual (default: `https://api.mayar.id/hl/v1/transactions`).

