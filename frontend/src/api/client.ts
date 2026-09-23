import type { AuthUser, Goal, GoalDetail, GoalInput, Task, TaskInput, TaskStatus } from "@/types";

interface Envelope<T> {
  data: T;
  goal?: { id: number; progress: number };
  error?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private getToken: () => string | null = () => null;
  private onUnauthorized: () => void = () => {};

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  configure(getToken: () => string | null, onUnauthorized: () => void): void {
    this.getToken = getToken;
    this.onUnauthorized = onUnauthorized;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (response.status === 204) {
      return { data: undefined as T };
    }
    let body: Envelope<T>;
    try {
      body = (await response.json()) as Envelope<T>;
    } catch {
      // Vite answers 502 with an empty body when the backend on port 4000 is not running
      throw new ApiError(response.status, "Backend tidak berjalan. Jalankan `npm run dev` di folder backend.");
    }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith("/auth/login")) {
        this.onUnauthorized();
      }
      throw new ApiError(response.status, body.error ?? "Request failed", body.details);
    }
    return body;
  }

  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    return (
      await this.request<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })
    ).data;
  }

  async listGoals(year?: number): Promise<Goal[]> {
    const query = year ? `?year=${year}` : "";
    return (await this.request<Goal[]>(`/goals${query}`)).data;
  }

  async getGoal(id: number): Promise<GoalDetail> {
    return (await this.request<GoalDetail>(`/goals/${id}`)).data;
  }

  async createGoal(input: GoalInput): Promise<Goal> {
    return (await this.request<Goal>("/goals", { method: "POST", body: JSON.stringify(input) })).data;
  }

  async updateGoal(id: number, input: Partial<GoalInput>): Promise<Goal> {
    return (await this.request<Goal>(`/goals/${id}`, { method: "PUT", body: JSON.stringify(input) })).data;
  }

  async deleteGoal(id: number): Promise<void> {
    await this.request<void>(`/goals/${id}`, { method: "DELETE" });
  }

  // Bearer auth means a plain link cannot download, so the CSV is fetched and handed to the browser as a file
  async downloadCsv(path: string, fallbackName: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Envelope<unknown>;
      if (response.status === 401) this.onUnauthorized();
      throw new ApiError(response.status, body.error ?? "Gagal mengunduh CSV");
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking synchronously can cancel the save in Chromium
  }

  async createTask(goalId: number, input: TaskInput): Promise<Task> {
    return (
      await this.request<Task>(`/goals/${goalId}/tasks`, { method: "POST", body: JSON.stringify(input) })
    ).data;
  }

  async setTaskStatus(id: number, status: TaskStatus): Promise<Task> {
    return (
      await this.request<Task>(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ).data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.request<null>(`/tasks/${id}`, { method: "DELETE" });
  }
}

export const api = new ApiClient();
