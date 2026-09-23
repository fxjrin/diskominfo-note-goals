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
  const json = response.status === 204 ? null : await response.json();
  return { status: response.status, json };
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

describe("goals, tasks and progress", () => {
  let goalId = 0;
  const taskIds: number[] = [];

  it("creates a goal with 0% progress", async () => {
    const res = await call("POST", "/goals", { title: "Test goal", year: 2026 });
    assert.equal(res.status, 201);
    goalId = res.json.data.id;
    assert.equal(res.json.data.progress, 0);
  });

  it("validates task input", async () => {
    const res = await call("POST", `/goals/${goalId}/tasks`, { title: "", month: 13 });
    assert.equal(res.status, 422);
  });

  it("adds three tasks and keeps progress at 0%", async () => {
    for (const month of [1, 2, 3]) {
      const res = await call("POST", `/goals/${goalId}/tasks`, { title: `Bulan ${month}`, month });
      assert.equal(res.status, 201);
      taskIds.push(res.json.data.id);
      assert.equal(res.json.goal.progress, 0);
    }
  });

  it("raises progress to 33.33% when one task is done", async () => {
    const res = await call("PATCH", `/tasks/${taskIds[0]}/status`, { status: "done" });
    assert.equal(res.status, 200);
    assert.equal(res.json.goal.progress, 33.33);
  });

  it("reports the quarter breakdown on the detail endpoint", async () => {
    const res = await call("GET", `/goals/${goalId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.data.progress, 33.33);
    assert.deepEqual(res.json.data.summary, { total: 3, done: 1 });
    const q1 = res.json.data.quarters[0];
    assert.equal(q1.done, 1);
    assert.equal(q1.total, 3);
    assert.equal(q1.contribution, 8.33);
  });

  it("drops progress back when the task is cancelled", async () => {
    const res = await call("PATCH", `/tasks/${taskIds[0]}/status`, { status: "pending" });
    assert.equal(res.json.goal.progress, 0);
  });

  it("reaches 100% when all tasks are done", async () => {
    let progress = 0;
    for (const id of taskIds) {
      const res = await call("PATCH", `/tasks/${id}/status`, { status: "done" });
      progress = res.json.goal.progress;
    }
    assert.equal(progress, 100);
  });

  it("recalculates when a task is deleted", async () => {
    const res = await call("DELETE", `/tasks/${taskIds[2]}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.goal.progress, 100);
  });

  it("stores SQL-looking input as plain text", async () => {
    const title = "x'); DROP TABLE goals; --";
    const res = await call("PUT", `/goals/${goalId}`, { title });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.title, title);
  });

  it("deletes the goal and its tasks", async () => {
    const res = await call("DELETE", `/goals/${goalId}`);
    assert.equal(res.status, 204);
    const gone = await call("GET", `/goals/${goalId}`);
    assert.equal(gone.status, 404);
  });
});
