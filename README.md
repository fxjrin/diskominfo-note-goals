# Aplikasi Pencatat Goals

Fullstack goal tracker: setiap goal dibagi menjadi beberapa periode dalam satu
tahun (kuartal, semester, bulanan, atau tahapan dengan tanggal bebas), setiap
periode berisi task bertanggal, dan setiap task yang selesai menaikkan
persentase progres goal sesuai bobot periodenya.

Dokumentasi pengguna lengkap (Bahasa Indonesia, dengan tangkapan layar) ada di
[docs/DOKUMENTASI.md](docs/DOKUMENTASI.md).

## Stack

- Backend: Node.js, Express 5, TypeScript, mysql2, zod, jsonwebtoken, bcryptjs
  (REST API, class-based layers: Repository, Service, Controller)
- Frontend: React 19, Vite, TypeScript, react-router, Tailwind CSS v4,
  shadcn/ui (Base UI) termasuk komponen Calendar, lucide-react, sonner
- Database: MySQL 8 (server panitia), nama database `fajrin_firmana`

## Menjalankan

Prasyarat: Node.js 20+ dan akses ke server MySQL panitia.

```bash
cp backend/.env.example backend/.env   # isi DB_PASSWORD dan JWT_SECRET
npm install                            # dependency root (concurrently)
npm run setup                          # install backend + frontend
npm run db:migrate --prefix backend    # buat database fajrin_firmana + tabel
npm run db:seed --prefix backend       # user demo + 3 contoh goal 2026 (bisa diulang)
npm run dev                            # backend :4000 + frontend :5173 bersamaan
```

Buka http://localhost:5173. Backend harus berjalan agar login bisa dipakai;
jika hanya frontend yang aktif, halaman akan menampilkan pesan bahwa backend
tidak berjalan.

Menjalankan terpisah (dua terminal):

```bash
cd backend && npm run dev     # http://localhost:4000/api
cd frontend && npm run dev    # http://localhost:5173, /api di-proxy ke backend
```

Akun demo: username `fajrin`, password `password123`.

Pengujian otomatis (22 kasus: login, validasi, CRUD goal/periode/task,
perubahan persentase, dan export CSV) berjalan terhadap database yang
dikonfigurasi di `backend/.env`:

```bash
npm test
```

## Struktur folder

```
.
  backend/
    sql/schema.sql                DDL database fajrin_firmana
    sql/upgrade-from-quarters.sql migrasi dari versi kuartal tetap (otomatis)
    src/config                    pembacaan environment
    src/database                  pool MySQL, migrate, seed
    src/models                    entitas User, Goal (+Period), Task
    src/repositories              akses data (prepared statement)
    src/services                  logika bisnis, perhitungan progres, export CSV
    src/controllers               handler HTTP
    src/middleware                auth JWT, validasi zod, error handler
    src/routes                    definisi endpoint
    test/api.test.ts              pengujian integrasi API
  frontend/
    src/api                       klien REST + unduh CSV
    src/lib                       auth context, util tanggal dan preset periode
    src/pages                     Login, daftar goal, detail goal
    src/components                editor periode, date picker, layout, shadcn/ui
  docs/
    DOKUMENTASI.md                panduan pengguna (Bahasa Indonesia)
    images/                       tangkapan layar
```

## Struktur data

- `users`: id, username (unik), name, password_hash (bcrypt)
- `goals`: id, user_id (FK cascade), title, description, year, progress
  (0-100, dihitung ulang otomatis di backend)
- `goal_periods`: id, goal_id (FK cascade), name, start_date, end_date,
  weight (0-100), position. Periode bebas: jumlah, nama, dan tanggalnya
  ditentukan pengguna, selama masih di dalam tahun goal.
- `tasks`: id, goal_id (FK cascade), period_id (FK cascade), title, due_date,
  status (`pending` | `done`), completed_at

## Logika persentase

Progres periode = task selesai / total task di periode itu x 100.
Progres goal = jumlah (bobot periode x progres periode / 100).

Contoh dari panitia ("Idaman Publik"): bobot Q1 25%, Q2 25%, Q3 0%, Q4 0%.
Q1 dan Q2 selesai semua, Q3 67%, Q4 0%, sehingga progres goal = 25 + 25 + 0
+ 0 = 50%. Dengan bobot sama dan satu task per bulan, rumus ini sama dengan
task selesai / total task x 100.

Nilai disimpan di `goals.progress` dan dihitung ulang di dalam transaksi
setiap kali task dibuat, diubah, atau dihapus, dan saat periode diubah.
Baris goal dikunci (`SELECT ... FOR UPDATE`) agar update bersamaan tidak
menghasilkan persentase basi.

Aturan periode:

- Minimal satu periode, maksimal 24, semua tanggal harus di dalam tahun goal.
- Total bobot maksimal 100% (bobot 0% diperbolehkan). Jika totalnya kurang
  dari 100%, progres goal maksimal sama dengan total itu.
- Tanggal task harus berada di dalam rentang periodenya (422 jika tidak).
- Periode yang masih punya task tidak bisa dihapus, dan rentang tanggalnya
  tidak bisa dipersempit melewati tanggal task yang ada (422).

## REST API

Semua endpoint selain `/health` dan `/auth/login` membutuhkan header
`Authorization: Bearer <token>`.

| Method | Path                      | Keterangan                          |
| ------ | ------------------------- | ----------------------------------- |
| GET    | /api/health               | cek koneksi database                |
| POST   | /api/auth/login           | `{username, password}` -> token JWT |
| GET    | /api/auth/me              | profil user yang sedang login       |
| GET    | /api/goals?year=2026      | daftar goal milik user + ringkasan task |
| POST   | /api/goals                | buat goal `{title, description?, year, periods?}` |
| GET    | /api/goals/:id            | detail goal + tasks + periods (progres per periode) |
| PUT    | /api/goals/:id            | ubah goal; `periods` `[{id?, name, startDate, endDate, weight}]` |
| DELETE | /api/goals/:id            | hapus goal beserta periode dan task-nya |
| GET    | /api/goals/:id/tasks      | daftar task                         |
| POST   | /api/goals/:id/tasks      | buat task `{title, periodId, dueDate}` |
| PUT    | /api/tasks/:id            | ubah task `{title?, periodId?, dueDate?, status?}` |
| PATCH  | /api/tasks/:id/status     | set status `{status}`               |
| DELETE | /api/tasks/:id            | hapus task                          |
| GET    | /api/export/goals?year=   | unduh CSV semua goal di tahun itu   |
| GET    | /api/export/goals/:id     | unduh CSV satu goal                 |

Tanggal memakai format `YYYY-MM-DD`. Respons mutasi task menyertakan
`goal: { id, progress }` terbaru. Jika `periods` tidak dikirim saat membuat
goal, dipakai 4 kuartal dengan bobot 25%.

## Keamanan

- Login memakai bcrypt untuk password dan JWT (HS256, kedaluwarsa 8 jam).
  Pesan error login sama untuk username salah maupun password salah.
- Setiap goal dan task terikat ke user; akses ke data milik user lain dijawab
  404 sehingga id tidak bisa ditebak.
- Semua query memakai prepared statement (parameter `?`), tidak ada string SQL
  dari input pengguna.
- Input divalidasi dengan zod sebelum menyentuh service (422 jika gagal).
- Body JSON dibatasi 64 KB, JSON rusak dijawab 400.
- Foreign key + CHECK constraint di database (rentang tanggal, bobot 0-100).
- Error internal tidak membocorkan detail ke klien (500 generik).
- CORS dibatasi ke origin frontend (`CORS_ORIGIN`).
