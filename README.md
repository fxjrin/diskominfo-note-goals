# Aplikasi Pencatat Goals

Fullstack goal tracker: setiap goal dipecah menjadi task per bulan, dan setiap
task yang selesai menaikkan persentase progres goal. Tahun dibagi menjadi
Q1-Q4 (masing-masing berbobot 25%), tiap kuartal berisi 3 bulan.

## Stack

- Backend: Node.js, Express 5, TypeScript, mysql2, zod, jsonwebtoken, bcryptjs
  (REST API, class-based layers: Repository, Service, Controller)
- Frontend: React 19, Vite, TypeScript, react-router, Tailwind CSS v4,
  shadcn/ui (Base UI), lucide-react, sonner
- Database: MySQL 8 (server panitia), nama database `fajrin_firmana`

## Menjalankan

Backend:

```bash
cd backend
cp .env.example .env   # isi DB_PASSWORD dan JWT_SECRET
npm install
npm run db:migrate     # membuat database fajrin_firmana + tabel dari sql/schema.sql
npm run db:seed        # user demo + contoh goal 2026 dengan 12 task
npm run dev            # http://localhost:4000/api
```

Frontend:

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, /api di-proxy ke backend
```

Akun demo: username `fajrin`, password `password123`.

Pengujian otomatis (13 kasus: login, validasi, CRUD, dan perubahan persentase)
berjalan terhadap database yang dikonfigurasi di `.env`:

```bash
cd backend
npm test
```

## Struktur folder

```
.
  backend/
    sql/schema.sql        DDL database fajrin_firmana
    src/config            pembacaan environment
    src/database          pool MySQL, migrate, seed
    src/models            entitas User, Goal, Task
    src/repositories      akses data (prepared statement)
    src/services          logika bisnis + perhitungan progres
    src/controllers       handler HTTP
    src/middleware        auth JWT, validasi zod, error handler
    src/routes            definisi endpoint
    test/api.test.ts      pengujian integrasi API
  frontend/
    src/api               klien REST
    src/lib               auth context
    src/pages             Login, daftar goal, detail goal
    src/components        layout, route guard, shadcn/ui
```

## Struktur data

- `users`: id, username (unik), name, password_hash (bcrypt)
- `goals`: id, user_id (FK cascade), title, description, year, progress
  (0-100, dihitung ulang otomatis di backend)
- `tasks`: id, goal_id (FK cascade), title, month (1-12), status
  (`pending` | `done`), completed_at

Kuartal diturunkan dari bulan: Q = ceil(month / 3).

## Logika persentase

`progress = task selesai / total task x 100`, disimpan di kolom `goals.progress`
dan dihitung ulang di dalam transaksi setiap kali task dibuat, diubah
statusnya, atau dihapus. Baris goal dikunci (`SELECT ... FOR UPDATE`) agar
update bersamaan tidak menghasilkan persentase basi.

Endpoint detail goal juga mengembalikan ringkasan per kuartal (task selesai,
total, persentase kuartal, dan kontribusi 25% ke tahun).

## REST API

Semua endpoint selain `/health` dan `/auth/login` membutuhkan header
`Authorization: Bearer <token>`.

| Method | Path                      | Keterangan                          |
| ------ | ------------------------- | ----------------------------------- |
| GET    | /api/health               | cek koneksi database                |
| POST   | /api/auth/login           | `{username, password}` -> token JWT |
| GET    | /api/auth/me              | profil user yang sedang login       |
| GET    | /api/goals?year=2026      | daftar goal milik user              |
| POST   | /api/goals                | buat goal `{title, description?, year}` |
| GET    | /api/goals/:id            | detail goal + tasks + quarters      |
| PUT    | /api/goals/:id            | ubah goal                           |
| DELETE | /api/goals/:id            | hapus goal beserta task-nya         |
| GET    | /api/goals/:id/tasks      | daftar task                         |
| POST   | /api/goals/:id/tasks      | buat task `{title, month}`          |
| PUT    | /api/tasks/:id            | ubah task `{title?, month?, status?}` |
| PATCH  | /api/tasks/:id/status     | set status `{status}`               |
| DELETE | /api/tasks/:id            | hapus task                          |

Respons mutasi task menyertakan `goal: { id, progress }` terbaru.

## Keamanan

- Login memakai bcrypt untuk password dan JWT (HS256, kedaluwarsa 8 jam).
  Pesan error login sama untuk username salah maupun password salah.
- Setiap goal dan task terikat ke user; akses ke data milik user lain dijawab
  404 sehingga id tidak bisa ditebak.
- Semua query memakai prepared statement (parameter `?`), tidak ada string SQL
  dari input pengguna.
- Input divalidasi dengan zod sebelum menyentuh service (422 jika gagal).
- Body JSON dibatasi 64 KB, JSON rusak dijawab 400.
- Foreign key + CHECK constraint di database (month 1-12, progress 0-100).
- Error internal tidak membocorkan detail ke klien (500 generik).
- CORS dibatasi ke origin frontend (`CORS_ORIGIN`).
