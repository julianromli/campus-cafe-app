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

