# Campus Cafe — catatan cepat

## Langkah berikutnya

1. `cd campus-cafe`
2. `bun run dev:setup` — mengarahkan setup proyek Convex
3. Salin variabel lingkungan dari `packages/backend/.env.local` ke `apps/*/.env` (lihat [Environment — Frontend](#environment--frontend-appswebenv))
4. Set variabel deployment Convex dari `packages/backend` (lihat [Environment — Convex](#environment--convex-deployment-backend))
5. `bun run dev`

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

## Mengelola environment Convex

Variabel untuk fungsi Convex (`process.env`) diatur di **deployment** Convex, bukan di file `.env` Vite.

Dari folder `packages/backend`:

```bash
npx convex env list
npx convex env get NAMA
npx convex env set NAMA 'nilai'
npx convex env set --from-file .env.convex
npx convex env remove NAMA
```

Nilai sensitif bisa di-set interaktif (`npx convex env set API_KEY`) atau dari file (`--from-file`) agar tidak masuk history shell.

### Demo seed (mock data lokal)

Untuk mengisi **meja**, **menu**, dan **event** ketika database masih kosong (idempoten per koleksi), ada mutation `seed:seedDemoData`. Hanya untuk **deployment dev** (atau staging): set secret di Convex, **jangan** memakai secret produksi yang sama atau biarkan fitur ini aktif di prod tanpa kebutuhan jelas.

```bash
cd packages/backend
npx convex env set DEMO_SEED_SECRET 'ganti-dengan-string-acak'
npx convex run seed:seedDemoData '{"secret":"ganti-dengan-string-acak"}'
```

- **Syarat:** minimal satu baris di tabel `users` (mis. daftar lewat `/sign-up`) agar event demo punya `createdBy`.
- **Isi:** meja bertanda `[Demo]` (campuran available / booked / occupied / inactive), kategori & item menu (satu item `available: false`), satu event **published** dengan `https://…` valid dan opsional satu **draft** jika belum ada event sama sekali.
- Jalankan ulang aman: koleksi yang sudah berisi dilewati (tidak diduplikasi).

---

## Environment — Frontend (`apps/web/.env`)

Schema validasi ada di `packages/env/src/web.ts`. Web memakai Vite: variabel yang **dibaca aplikasi** harus diawali `VITE_`.

| Variabel | Wajib? | Fungsi |
| -------- | ------ | ------ |
| `VITE_CONVEX_URL` | Ya | URL deployment Convex (`https://…convex.cloud`) — `ConvexReactClient` |
| `VITE_CONVEX_SITE_URL` | Ya | Origin Convex untuk HTTP/actions (`https://…convex.site`) — Better Auth client (`baseURL`) |
| `VITE_GOOGLE_CLIENT_ID` | Tidak | Jika diisi, tombol sign-in Google di `/sign-in` aktif |

**Yang tidak dipakai runtime frontend:** `BETTER_AUTH_SECRET`, `MAYAR_*`, `RESEND_*`, dan secret lain untuk backend — itu untuk [Convex](#environment--convex-deployment-backend), jangan mengandalkan mereka di kode client.

Salin `VITE_CONVEX_URL` dan `VITE_CONVEX_SITE_URL` dari output `bun run dev:setup` / `packages/backend/.env.local` (nilai `CONVEX_URL` → `VITE_CONVEX_URL`, `CONVEX_SITE_URL` → `VITE_CONVEX_SITE_URL`).

---

## Environment — Lokal Convex CLI (`packages/backend/.env.local`)

File ini dipakai **`npx convex dev`** (deployment dev, codegen), bukan untuk bundle `apps/web`.

| Variabel | Fungsi |
| -------- | ------ |
| `CONVEX_DEPLOYMENT` | Mis. `dev:nama-deployment` — menghubungkan CLI ke proyek |
| `CONVEX_URL` | `https://…convex.cloud` |
| `CONVEX_SITE_URL` | `https://…convex.site` |

---

## Environment — Convex (deployment backend)

Set dari **`packages/backend`** dengan `npx convex env set …` (atau dashboard Convex). Di fungsi Convex, akses lewat `process.env.NAMA`.

### Auth & URL aplikasi

| Variabel | Wajib? | Fungsi |
| -------- | ------ | ------ |
| `SITE_URL` | Ya | Origin app web (`http://localhost:5173` dev / domain prod): trusted origins (`http.ts`), Better Auth, link di email |
| `BETTER_AUTH_SECRET` | Ya | Secret Better Auth (random 32+ byte, mis. base64) |
| `GOOGLE_CLIENT_ID` | Tidak | OAuth Google (server) |
| `GOOGLE_CLIENT_SECRET` | Tidak | OAuth Google (server) |

Contoh:

```bash
cd packages/backend
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL http://localhost:5173
```

> Di Windows PowerShell, ganti `$(openssl …)` dengan string acak manual atau perintah setara.

### Email (Resend — komponen `@convex-dev/resend`)

| Variabel | Wajib? | Fungsi |
| -------- | ------ | ------ |
| `RESEND_API_KEY` | Ya jika email aktif | API key Resend |
| `EMAIL_FROM_ADDRESS` | Tidak | Default ada fallback di `emails.ts` |
| `RESEND_TEST_MODE` | Tidak | Jika bukan `"false"`, mode uji Resend (pembatasan penerima) |
| `RESEND_WEBHOOK_SECRET` | Tidak | Hanya jika memakai webhook event Resend |

```bash
npx convex env set RESEND_API_KEY re_...
npx convex env set EMAIL_FROM_ADDRESS "Campus Cafe <onboarding@resend.dev>"
npx convex env set RESEND_TEST_MODE false
# npx convex env set RESEND_WEBHOOK_SECRET ...
```

`SITE_URL` dipakai untuk link “Lihat reservasiku” di email konfirmasi.

### Mayar.id (pembayaran)

| Variabel | Wajib? | Fungsi |
| -------- | ------ | ------ |
| `MAYAR_API_KEY` | Ya untuk bayar & sync | Membuat link pembayaran + polling status (admin **Sync Status**) |
| `MAYAR_WEBHOOK_SECRET` | Sangat disarankan di production | Verifikasi webhook; nilai harus cocok dengan header dari Mayar (`x-mayar-webhook-secret` / `x-webhook-secret` / `Authorization: Bearer …`) |
| `MAYAR_PAYMENT_CREATE_URL` | Tidak | Override endpoint create (default: `https://api.mayar.id/hl/v1/payment/create`) |
| `MAYAR_TRANSACTIONS_URL` | Tidak | Override daftar transaksi untuk sinkron manual (default: `https://api.mayar.id/hl/v1/transactions`) |

### Harga reservasi

| Variabel | Wajib? | Fungsi |
| -------- | ------ | ------ |
| `RESERVATION_PRICE_PER_HOUR` | Ya untuk total benar | IDR per jam (integer). Total = `durationHours × RESERVATION_PRICE_PER_HOUR` di `payments.createReservationPaymentLink` |

### Keamanan

- Jangan commit file `.env` berisi secret ke git.
- Rotasi token jika pernah terbocor (Cloudflare, Mayar, `BETTER_AUTH_SECRET`, dll.).

### CI/CD deploy backend

Untuk perintah Convex non-interaktif bisa dipakai `CONVEX_DEPLOY_KEY` — lihat dokumentasi Convex (“Deploy keys”).

---

## Reservation hold (auto-expire)

Setelah customer klik *Reservasi* dan sebelum selesai membayar di Mayar, slot di-hold sebagai `pending` dan juga mem-blok pengguna lain untuk slot/waktu yang sama. Jika pembayaran tidak selesai dalam **30 menit**, reservasi otomatis dibatalkan oleh `internal.reservations.expirePendingReservation` (dijadwalkan via `ctx.scheduler.runAfter`). Customer yang terkena expiry dapat mencoba membooking ulang.

---

## Checklist pengujian (QA)

Acuan: `docs/PRD.md` v1.3 dan `docs/BACKLOG.md`. Tandai manual saat verifikasi pre-launch / regression.

### Autentikasi & peran

- [ ] Register email/password → verifikasi email → login
- [ ] Login Google (jika `VITE_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` di Convex diset)
- [ ] Baris `users` terbuat di Convex untuk tiap jalur login
- [ ] Customer tidak mengakses `/admin/*` atau `/staff/*`; staff tidak mengakses route admin kecuali peran admin

### Meja & reservasi

- [ ] Floor plan: hijau bisa klik, merah tidak, meja inactive tidak tampil untuk customer; pembaruan real-time (±2 detik)
- [ ] Form: tanggal dalam window, jam, durasi 1/2/3 jam, jumlah tamu ≤ kapasitas; konflik slot ditolak (frontend + backend)
- [ ] Alur bayar: buat reservasi → redirect Mayar → webhook `payment.received` → `confirmed`, meja `booked`, email konfirmasi (jika Resend aktif)
- [ ] Idempotency webhook: permintaan ganda tidak mengubah state dua kali
- [ ] **Reservasi saya:** tab upcoming/past, kode konfirmasi, pembatalan dalam window; pesan refund; error jika melewati cutoff
- [ ] Pembatalan reservasi berbayar: notifikasi in-app admin + email pembatalan

### Staff & admin — operasi meja

- [ ] Papan reservasi: tampilan floor + list; **Mark occupied** / **Release** dengan konfirmasi; tidak ada pelepasan otomatis berbasis waktu
- [ ] Admin: editor layout (drag, tambah/edit/hapus, toggle inactive)

### Event (listing saja, tanpa tiket in-app)

- [ ] Homepage + `/events`: hanya published, belum berakhir; urutan kronologis; kartu ke `/events/:id`
- [ ] Detail event: CTA ke `externalUrl` (tab baru, `noopener`); opsional link ke `/reserve`
- [ ] Admin CRUD: draft vs publish; publish membutuhkan URL `https` valid; hapus dengan konfirmasi

### Menu & QR `/table/:tableId`

- [ ] Halaman cepat; menu terlihat tanpa login; login diminta saat tambah ke keranjang / pesan
- [ ] Harga dari server; item sold out tidak bisa dipesan; pesanan walk-in vs reservation aktif sesuai logika backend

### Pesanan

- [ ] Antrian staff: Pending → Preparing → Ready → completed; pembaruan real-time
- [ ] **Pesanan saya** + status di halaman meja; sinkron saat staff mengubah status

### Analytics

- [ ] Dashboard admin: ringkasan hari ini + tren 30 hari; timestamp referensi dari client (bukan `Date.now()` di query)

### Profil & manajemen staff

- [ ] Profil: ubah nama, telepon, avatar; persisten setelah refresh
- [ ] Admin: undangan staff, ubah peran, revoke; email undangan (Resend)

### Pembayaran (admin)

- [ ] Daftar pembayaran; tombol **Sync Status** untuk `pending` saat webhook gagal (butuh `MAYAR_API_KEY` + endpoint transaksi)

### Polish

- [ ] Skeleton di halaman yang memuat data Convex
- [ ] PWA: `manifest.json`, bisa di-install (smoke test)
- [ ] Responsif ±375px: tidak overflow horizontal, tap target memadai, floor plan bisa di-scroll

### Non-fungsional / production

- [ ] `SITE_URL` dan redirect OAuth/email cocok dengan domain deployment
- [ ] Webhook Mayar: secret cocok dengan konfigurasi di dashboard Mayar
- [ ] Opsional: LCP / performa (target PRD: di bawah 2,5 s di koneksi mobile) — Lighthouse atau uji manual

---

*Dokumen ini diselaraskan dengan implementasi backlog (PRD v1.3).*
