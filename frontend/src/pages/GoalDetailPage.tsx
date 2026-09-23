import { ArrowLeft, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api/client";
import { DatePicker } from "@/components/DatePicker";
import { PeriodEditor } from "@/components/PeriodEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatRange, toIso } from "@/lib/dates";
import { StatusBadge } from "@/pages/GoalsPage";
import { goalStatus, periodError, type GoalDetail, type PeriodInput, type PeriodSummary, type Task } from "@/types";

type Runner = (action: () => Promise<unknown>, success: string, fallback: string) => Promise<void>;

export function GoalDetailPage() {
  const { id } = useParams();
  const goalId = Number(id);
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getGoal(goalId)
      .then((detail) => {
        if (!cancelled) setGoal(detail);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat goal");
      });
    return () => {
      cancelled = true;
    };
  }, [goalId, refreshKey]);

  const run: Runner = async (action, success, fallback) => {
    try {
      await action();
      if (success) toast.success(success);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : fallback);
    }
  };

  async function handleDeleteGoal() {
    try {
      await api.deleteGoal(goalId);
      toast.success("Goal dihapus");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus goal");
    }
  }

  async function exportCsv() {
    try {
      await api.downloadCsv(`/export/goals/${goalId}`, `goal-${goalId}.csv`);
      toast.success("File CSV diunduh");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunduh CSV");
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-medium">{error}</p>
          <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
            <ArrowLeft className="size-4" />
            Kembali ke daftar goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!goal) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const status = goalStatus(goal.progress, goal.summary.total);
  const columns = goal.periods.length >= 4 ? "xl:grid-cols-4" : goal.periods.length === 3 ? "xl:grid-cols-3" : "";

  return (
    <div className="grid gap-6">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" nativeButton={false} render={<Link to="/" />}>
        <ArrowLeft className="size-4" />
        Semua goals
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{goal.title}</h1>
                <StatusBadge tone={status.tone} label={status.label} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Tahun {goal.year}
                {goal.description ? `. ${goal.description}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="size-4" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Ubah
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Hapus
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-medium">Progres tahun ini</p>
              <p className="text-sm text-muted-foreground">
                {goal.summary.total === 0
                  ? "Belum ada task. Tambahkan task di periode di bawah."
                  : `${goal.summary.done} dari ${goal.summary.total} task selesai.`}
              </p>
            </div>
            <span className="text-4xl font-semibold tabular-nums text-primary">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="[&_[data-slot=progress-track]]:h-3" />
          <p className="text-xs text-muted-foreground">
            Setiap periode menyumbang sesuai bobotnya. Centang task untuk menaikkan progres, hilangkan centang untuk
            menurunkannya.
          </p>
        </CardContent>
      </Card>

      <div className={`grid gap-4 md:grid-cols-2 ${columns}`}>
        {goal.periods.map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            tasks={goal.tasks.filter((task) => task.periodId === period.id)}
            goalId={goalId}
            run={run}
          />
        ))}
      </div>

      <EditGoalDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} run={run} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus goal "{goal.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {goal.summary.total > 0
                ? `Semua ${goal.summary.total} task di dalamnya ikut terhapus dan tidak bisa dikembalikan.`
                : "Goal ini belum punya task. Penghapusan tidak bisa dikembalikan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteGoal}>
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PeriodCardProps {
  period: PeriodSummary;
  tasks: Task[];
  goalId: number;
  run: Runner;
}

// Today when it falls inside the period, otherwise the period start, so the picker opens somewhere sensible
function defaultDue(period: PeriodSummary): string {
  const today = toIso(new Date());
  return today >= period.startDate && today <= period.endDate ? today : period.startDate;
}

function PeriodCard({ period, tasks, goalId, run }: PeriodCardProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => defaultDue(period));
  const status = goalStatus(period.progress, period.total);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTitle("");
    await run(
      () => api.createTask(goalId, { title: value, periodId: period.id, dueDate }),
      "Task ditambahkan",
      "Gagal menambah task",
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{period.name}</h2>
            <StatusBadge tone={status.tone} label={status.label} />
          </div>
          <span className="text-lg font-semibold tabular-nums text-primary">{period.progress}%</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatRange(period.startDate, period.endDate)}. Bobot {period.weight}% dari tahun.
        </p>
        <Progress value={period.progress} className="mt-1" />
        <p className="text-xs text-muted-foreground">
          {period.total === 0 ? "Belum ada task" : `${period.done} dari ${period.total} task selesai`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {tasks.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            Belum ada task di periode ini.
          </p>
        ) : (
          <ul className="grid gap-0.5">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} run={run} />
            ))}
          </ul>
        )}
        <form onSubmit={handleAdd} className="mt-auto grid gap-2 border-t pt-3">
          <Input
            className="h-8"
            placeholder="Tulis task baru"
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={`Task baru ${period.name}`}
          />
          <div className="flex gap-2">
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              min={period.startDate}
              max={period.endDate}
              size="sm"
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!title.trim()}>
              <Plus className="size-4" />
              Tambah
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task, run }: { task: Task; run: Runner }) {
  const done = task.status === "done";
  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
      <Checkbox
        id={`task-${task.id}`}
        checked={done}
        onCheckedChange={(checked) =>
          run(
            () => api.setTaskStatus(task.id, checked ? "done" : "pending"),
            checked ? "Task selesai" : "Task dibatalkan",
            "Gagal mengubah status",
          )
        }
      />
      <Label
        htmlFor={`task-${task.id}`}
        className={`min-w-0 flex-1 cursor-pointer text-sm font-normal ${done ? "text-muted-foreground line-through" : ""}`}
      >
        <span className="truncate">{task.title}</span>
      </Label>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDate(task.dueDate, "d MMM")}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Hapus ${task.title}`}
        onClick={() => run(() => api.deleteTask(task.id), "Task dihapus", "Gagal menghapus task")}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}

interface EditGoalDialogProps {
  goal: GoalDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: Runner;
}

function EditGoalDialog({ goal, open, onOpenChange, run }: EditGoalDialogProps) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [periods, setPeriods] = useState<PeriodInput[]>(() =>
    goal.periods.map(({ id, name, startDate, endDate, weight }) => ({ id, name, startDate, endDate, weight })),
  );
  const invalid = periodError(periods, goal.year);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await run(
      () => api.updateGoal(goal.id, { title: title.trim(), description: description.trim() || null, periods }),
      "Perubahan disimpan",
      "Gagal menyimpan goal",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Ubah goal</DialogTitle>
            <DialogDescription>
              Periode yang masih punya task tidak bisa dihapus, dan tanggalnya tidak bisa dipersempit melewati task.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Nama goal</Label>
            <Input id="edit-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-desc">Keterangan</Label>
            <Textarea
              id="edit-desc"
              rows={2}
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <PeriodEditor year={goal.year} value={periods} onChange={setPeriods} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!title.trim() || invalid !== null}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
