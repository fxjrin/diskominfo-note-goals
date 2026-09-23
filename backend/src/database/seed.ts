import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { config } from "../config/env.js";

const DEMO_USER = { username: "fajrin", name: "Fajrin Firmana", password: "password123" };

const TASKS = [
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
];

async function seed(): Promise<void> {
  const conn = await mysql.createConnection(config.db);
  try {
    const hash = await bcrypt.hash(DEMO_USER.password, 10);
    await conn.execute(
      "INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)",
      [DEMO_USER.username, DEMO_USER.name, hash],
    );
    const [users] = await conn.execute<mysql.RowDataPacket[]>("SELECT id FROM users WHERE username = ?", [
      DEMO_USER.username,
    ]);
    const userId = users[0]!.id as number;

    const [goal] = await conn.execute<mysql.ResultSetHeader>(
      "INSERT INTO goals (user_id, title, description, year) VALUES (?, ?, ?, ?)",
      [userId, "Belajar bahasa asing", "Satu task per bulan sepanjang 2026", 2026],
    );
    for (const [index, title] of TASKS.entries()) {
      await conn.execute("INSERT INTO tasks (goal_id, title, month) VALUES (?, ?, ?)", [
        goal.insertId,
        title,
        index + 1,
      ]);
    }
    console.log(`Seeded user ${DEMO_USER.username} / ${DEMO_USER.password} with one goal and 12 tasks`);
  } finally {
    await conn.end();
  }
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
