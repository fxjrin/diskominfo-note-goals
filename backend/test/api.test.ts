import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import app from "../src/app.js";
import { Database } from "../src/database/Database.js";

const DEMO = { username: "fajrin", password: "password123" };

let baseUrl = "";
let token = "";
let server: ReturnType<typeof app.listen>;

async function call(method: string, path: string, body?: unknown, auth = true) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const type = response.headers.get("content-type") ?? "";
  const json = response.status === 204 ? null : type.includes("json") ? await response.json() : await response.text();
  return { status: response.status, json, type };
}

before(() => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server did not bind a port");
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  server.close();
  await Database.get().close();
});

describe("auth", () => {
  it("rejects requests without a token", async () => {
    const res = await call("GET", "/goals", undefined, false);
    assert.equal(res.status, 401);
  });

  it("rejects a wrong password with the same message as an unknown user", async () => {
    const wrong = await call("POST", "/auth/login", { username: DEMO.username, password: "x" }, false);
    const unknown = await call("POST", "/auth/login", { username: "nobody", password: "x" }, false);
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.json.error, unknown.json.error);
  });

  it("logs in the demo user", async () => {
    const res = await call("POST", "/auth/login", DEMO, false);
    assert.equal(res.status, 200);
    token = res.json.data.token;
    assert.ok(token);
    assert.equal(res.json.data.user.username, DEMO.username);
  });
});

describe("goals with default quarter periods", () => {
  let goalId = 0;
  let q1 = 0;
  const taskIds: number[] = [];

  it("creates a goal with four quarter periods at 25% each", async () => {
    const res = await call("POST", "/goals", { title: "Test goal", year: 2026 });
    assert.equal(res.status, 201);
    goalId = res.json.data.id;
    assert.equal(res.json.data.progress, 0);
    const periods = res.json.data.periods;
    assert.equal(periods.length, 4);
    assert.deepEqual(periods.map((p: { name: string }) => p.name), ["Q1", "Q2", "Q3", "Q4"]);
    assert.equal(periods[0].startDate, "2026-01-01");
    assert.equal(periods[0].endDate, "2026-03-31");
    assert.equal(periods[0].weight, 25);
    q1 = periods[0].id;
  });

  it("rejects a task whose date is outside its period", async () => {
    const res = await call("POST", `/goals/${goalId}/tasks`, { title: "Salah", periodId: q1, dueDate: "2026-04-01" });
    assert.equal(res.status, 422);
  });

  it("rejects invalid input", async () => {
    const res = await call("POST", `/goals/${goalId}/tasks`, { title: "", periodId: q1, dueDate: "2026-02-30" });
    assert.equal(res.status, 422);
  });

  it("adds three Q1 tasks and keeps progress at 0%", async () => {
    for (const date of ["2026-01-15", "2026-02-15", "2026-03-15"]) {
      const res = await call("POST", `/goals/${goalId}/tasks`, { title: `Task ${date}`, periodId: q1, dueDate: date });
      assert.equal(res.status, 201);
      assert.equal(res.json.data.dueDate, date);
      taskIds.push(res.json.data.id);
      assert.equal(res.json.goal.progress, 0);
    }
  });

  it("raises progress to 8.33% when one of three Q1 tasks is done (33.33% of a 25% period)", async () => {
    const res = await call("PATCH", `/tasks/${taskIds[0]}/status`, { status: "done" });
    assert.equal(res.status, 200);
    assert.equal(res.json.goal.progress, 8.33);
  });

  it("reports the period breakdown on the detail endpoint", async () => {
    const res = await call("GET", `/goals/${goalId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.data.progress, 8.33);
    assert.deepEqual(res.json.data.summary, { total: 3, done: 1 });
    const first = res.json.data.periods[0];
    assert.equal(first.done, 1);
    assert.equal(first.total, 3);
    assert.equal(first.progress, 33.33);
    assert.equal(first.contribution, 8.33);
  });

  it("drops progress back when the task is cancelled", async () => {
    const res = await call("PATCH", `/tasks/${taskIds[0]}/status`, { status: "pending" });
    assert.equal(res.json.goal.progress, 0);
  });

  it("reaches 25% when every Q1 task is done and the other periods are empty", async () => {
    let progress = 0;
    for (const id of taskIds) {
      const res = await call("PATCH", `/tasks/${id}/status`, { status: "done" });
      progress = res.json.goal.progress;
    }
    assert.equal(progress, 25);
  });

  it("recalculates when a task is deleted", async () => {
    const res = await call("DELETE", `/tasks/${taskIds[2]}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.goal.progress, 25);
  });

  it("stores SQL-looking input as plain text", async () => {
    const title = "x'); DROP TABLE goals; --";
    const res = await call("PUT", `/goals/${goalId}`, { title });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.title, title);
  });

  it("exports the goal as CSV", async () => {
    const res = await call("GET", `/export/goals/${goalId}`);
    assert.equal(res.status, 200);
    assert.ok(res.type.startsWith("text/csv"));
    assert.ok(res.json.includes("Goal,Tahun,Progres Goal (%)"));
    assert.ok(res.json.includes("Task 2026-01-15"));
    assert.ok(res.json.includes('"x\'); DROP TABLE goals; --"'));
  });

  it("deletes the goal and its tasks", async () => {
    const res = await call("DELETE", `/goals/${goalId}`);
    assert.equal(res.status, 204);
    const gone = await call("GET", `/goals/${goalId}`);
    assert.equal(gone.status, 404);
  });
});

describe("goals with custom periods", () => {
  let goalId = 0;
  let tahap1 = 0;
  let tahap2 = 0;

  it("creates a goal with two named periods and custom weights", async () => {
    const res = await call("POST", "/goals", {
      title: "Dua tahap",
      year: 2026,
      periods: [
        { name: "Tahap 1", startDate: "2026-01-01", endDate: "2026-06-30", weight: 70 },
        { name: "Tahap 2", startDate: "2026-07-01", endDate: "2026-12-31", weight: 30 },
      ],
    });
    assert.equal(res.status, 201);
    goalId = res.json.data.id;
    [tahap1, tahap2] = res.json.data.periods.map((p: { id: number }) => p.id);
  });

  it("rejects periods outside the goal year, bad ranges, and weights above 100", async () => {
    const outside = await call("PUT", `/goals/${goalId}`, {
      periods: [{ id: tahap1, name: "Tahap 1", startDate: "2025-12-01", endDate: "2026-06-30", weight: 50 }],
    });
    assert.equal(outside.status, 422);
    const reversed = await call("PUT", `/goals/${goalId}`, {
      periods: [{ id: tahap1, name: "Tahap 1", startDate: "2026-06-30", endDate: "2026-01-01", weight: 50 }],
    });
    assert.equal(reversed.status, 422);
    const heavy = await call("PUT", `/goals/${goalId}`, {
      periods: [
        { id: tahap1, name: "Tahap 1", startDate: "2026-01-01", endDate: "2026-06-30", weight: 60 },
        { id: tahap2, name: "Tahap 2", startDate: "2026-07-01", endDate: "2026-12-31", weight: 50 },
      ],
    });
    assert.equal(heavy.status, 422);
  });

  it("weights progress by period", async () => {
    const t1 = await call("POST", `/goals/${goalId}/tasks`, { title: "A", periodId: tahap1, dueDate: "2026-03-01" });
    const t2 = await call("POST", `/goals/${goalId}/tasks`, { title: "B", periodId: tahap2, dueDate: "2026-09-01" });
    await call("POST", `/goals/${goalId}/tasks`, { title: "C", periodId: tahap2, dueDate: "2026-10-01" });
    const afterT1 = await call("PATCH", `/tasks/${t1.json.data.id}/status`, { status: "done" });
    assert.equal(afterT1.json.goal.progress, 70);
    const afterT2 = await call("PATCH", `/tasks/${t2.json.data.id}/status`, { status: "done" });
    assert.equal(afterT2.json.goal.progress, 85);
  });

  it("refuses to drop a period that still has tasks", async () => {
    const res = await call("PUT", `/goals/${goalId}`, {
      periods: [{ id: tahap1, name: "Tahap 1", startDate: "2026-01-01", endDate: "2026-12-31", weight: 100 }],
    });
    assert.equal(res.status, 422);
  });

  it("refuses to shrink a period past its tasks", async () => {
    const res = await call("PUT", `/goals/${goalId}`, {
      periods: [
        { id: tahap1, name: "Tahap 1", startDate: "2026-01-01", endDate: "2026-02-28", weight: 70 },
        { id: tahap2, name: "Tahap 2", startDate: "2026-03-01", endDate: "2026-12-31", weight: 30 },
      ],
    });
    assert.equal(res.status, 422);
  });

  it("renames, reweights, and adds a period while keeping tasks attached", async () => {
    const res = await call("PUT", `/goals/${goalId}`, {
      periods: [
        { id: tahap1, name: "Semester 1", startDate: "2026-01-01", endDate: "2026-06-30", weight: 50 },
        { id: tahap2, name: "Semester 2", startDate: "2026-07-01", endDate: "2026-11-30", weight: 40 },
        { name: "Evaluasi", startDate: "2026-12-01", endDate: "2026-12-31", weight: 10 },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.periods.length, 3);
    assert.equal(res.json.data.periods[0].name, "Semester 1");
    assert.equal(res.json.data.progress, 70);
  });

  it("allows weights below 100, which caps the goal at that total", async () => {
    const res = await call("PUT", `/goals/${goalId}`, {
      periods: [
        { id: tahap1, name: "Semester 1", startDate: "2026-01-01", endDate: "2026-06-30", weight: 25 },
        { id: tahap2, name: "Semester 2", startDate: "2026-07-01", endDate: "2026-12-31", weight: 25 },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.progress, 37.5);
    await call("DELETE", `/goals/${goalId}`);
  });
});
