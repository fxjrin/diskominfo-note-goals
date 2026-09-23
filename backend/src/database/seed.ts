import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { config } from "../config/env.js";
import { defaultPeriods, type PeriodInput } from "../models/Goal.js";
import { ProgressCalculator, type PeriodCount } from "../services/ProgressCalculator.js";

const DEMO_USER = { username: "fajrin", name: "Fajrin Firmana", password: "password123" };

interface SeedTask {
  title: string;
  period: number;
  dueDate: string;
  done: boolean;
}

interface SeedGoal {
  title: string;
  description: string;
  year: number;
  periods: PeriodInput[];
  tasks: SeedTask[];
}

const MONTH_ENDS = ["31", "28", "31", "30", "31", "30", "31", "31", "30", "31", "30", "31"];

function endOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${MONTH_ENDS[month - 1]}`;
}

const GOALS: SeedGoal[] = [
  {
    title: "Idaman Publik",
    description: "1 Januari 2026 - 31 Desember 2026, contoh dari panitia",
    year: 2026,
    periods: defaultPeriods(2026).map((p, index) => ({ ...p, weight: index < 2 ? 25 : 0 })),
    tasks: [
      { title: "Fitur Login", period: 0, dueDate: endOfMonth(2026, 1), done: true },
      { title: "Crud User", period: 0, dueDate: endOfMonth(2026, 2), done: true },
      { title: "Role Management", period: 0, dueDate: endOfMonth(2026, 3), done: true },
      { title: "Crud Management", period: 1, dueDate: endOfMonth(2026, 4), done: true },
      { title: "Dan lain lain", period: 1, dueDate: endOfMonth(2026, 5), done: true },
      { title: "Fitur Login", period: 2, dueDate: endOfMonth(2026, 7), done: true },
      { title: "Crud User", period: 2, dueDate: endOfMonth(2026, 8), done: true },
      { title: "Role Management", period: 2, dueDate: endOfMonth(2026, 9), done: false },
      { title: "Crud Management", period: 3, dueDate: endOfMonth(2026, 10), done: false },
      { title: "Dan lain lain", period: 3, dueDate: endOfMonth(2026, 11), done: false },
    ],
  },
  {
    title: "Belajar bahasa asing",
    description: "Satu task per bulan sepanjang 2026",
    year: 2026,
    periods: defaultPeriods(2026),
    tasks: [
      "Hafal 50 kata dasar",
      "Pelajari tata bahasa dasar",
      "Latihan percakapan sederhana",
      "Hafal 100 kata baru",
      "Baca satu artikel pendek",
      "Tonton film tanpa subtitle",
      "Tulis jurnal harian singkat",
      "Ikut kelas percakapan",
      "Baca satu buku ringan",
      "Presentasi 5 menit",
      "Ujian simulasi level A2",
      "Evaluasi dan rencana tahun depan",
    ].map((title, index) => ({
      title,
      period: Math.floor(index / 3),
      dueDate: endOfMonth(2026, index + 1),
      done: false,
    })),
  },
  {
    title: "Renovasi rumah",
    description: "Contoh periode bebas: tiga tahap dengan tanggal dan bobot berbeda",
    year: 2026,
    periods: [
      { name: "Persiapan", startDate: "2026-01-05", endDate: "2026-02-15", weight: 20 },
      { name: "Pengerjaan", startDate: "2026-02-16", endDate: "2026-08-31", weight: 60 },
      { name: "Finishing", startDate: "2026-09-01", endDate: "2026-11-30", weight: 20 },
    ],
    tasks: [
      { title: "Survey tukang", period: 0, dueDate: "2026-01-20", done: true },
      { title: "Hitung anggaran", period: 0, dueDate: "2026-02-10", done: true },
      { title: "Bongkar dapur", period: 1, dueDate: "2026-03-15", done: true },
      { title: "Pasang instalasi listrik", period: 1, dueDate: "2026-05-30", done: false },
      { title: "Pasang keramik", period: 1, dueDate: "2026-07-31", done: false },
      { title: "Pengecatan", period: 2, dueDate: "2026-10-15", done: false },
    ],
  },
];

async function seed(): Promise<void> {
  const conn = await mysql.createConnection({ ...config.db, dateStrings: ["DATE"] });
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(DEMO_USER.password, 10);
    await conn.execute(
      "INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)",
      [DEMO_USER.username, DEMO_USER.name, hash],
    );
    const [users] = await conn.execute<mysql.RowDataPacket[]>("SELECT id FROM users WHERE username = ?", [
      DEMO_USER.username,
    ]);
    const userId = users[0]!.id as number;

    // Re-seeding replaces the demo user's goals so the sample data stays exactly as documented
    await conn.execute("DELETE FROM goals WHERE user_id = ?", [userId]);

    for (const goal of GOALS) {
      const [inserted] = await conn.execute<mysql.ResultSetHeader>(
        "INSERT INTO goals (user_id, title, description, year) VALUES (?, ?, ?, ?)",
        [userId, goal.title, goal.description, goal.year],
      );
      const periodIds: number[] = [];
      for (const [position, period] of goal.periods.entries()) {
        const [row] = await conn.execute<mysql.ResultSetHeader>(
          "INSERT INTO goal_periods (goal_id, name, start_date, end_date, weight, position) VALUES (?, ?, ?, ?, ?, ?)",
          [inserted.insertId, period.name, period.startDate, period.endDate, period.weight, position],
        );
        periodIds.push(row.insertId);
      }
      for (const task of goal.tasks) {
        await conn.execute(
          "INSERT INTO tasks (goal_id, period_id, title, due_date, status, completed_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            inserted.insertId,
            periodIds[task.period],
            task.title,
            task.dueDate,
            task.done ? "done" : "pending",
            task.done ? new Date() : null,
          ],
        );
      }
      const counts: PeriodCount[] = periodIds.map((periodId, index) => {
        const scoped = goal.tasks.filter((task) => task.period === index);
        return { periodId, total: scoped.length, done: scoped.filter((task) => task.done).length };
      });
      const periods = goal.periods.map((p, index) => ({ ...p, id: periodIds[index]!, position: index }));
      const progress = ProgressCalculator.overall(periods, counts);
      await conn.execute("UPDATE goals SET progress = ? WHERE id = ?", [progress, inserted.insertId]);
      const done = goal.tasks.filter((task) => task.done).length;
      console.log(`Seeded goal "${goal.title}" (${done}/${goal.tasks.length} task selesai, ${progress}%)`);
    }
    await conn.commit();
    console.log(`Login demo: ${DEMO_USER.username} / ${DEMO_USER.password}`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
