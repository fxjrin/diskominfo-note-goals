import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api/client";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { monthName, type GoalDetail, type QuarterSummary, type Task } from "@/types";

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
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const achieved = goal.progress >= 100;

  return (
    <div className="grid gap-6">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" nativeButton={false} render={<Link to="/" />}>
        <ArrowLeft className="size-4" />
        Semua goals
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{goal.title}</CardTitle>
                <Badge variant={achieved ? "default" : "secondary"}>{achieved ? "Tercapai" : "Berjalan"}</Badge>
                <Badge variant="outline">{goal.year}</Badge>
              </div>
              {goal.description && <CardDescription className="mt-1">{goal.description}</CardDescription>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Hapus
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progres keseluruhan</p>
              <p className="text-xs text-muted-foreground">
                {goal.summary.done} dari {goal.summary.total} task selesai. Persentase = task selesai / total task x 100.
              </p>
            </div>
            <span className="text-3xl font-semibold tabular-nums text-primary">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="[&_[data-slot=progress-track]]:h-3" />
          <Separator className="my-1" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {goal.quarters.map((quarter) => (
              <Tooltip key={quarter.quarter}>
                <TooltipTrigger
                  render={
                    <div className="rounded-md border p-3 text-left">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{quarter.label}</span>
                        <span>bobot {quarter.weight}%</span>
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums">{quarter.progress}%</div>
                      <Progress value={quarter.progress} className="mt-1" />
                    </div>
                  }
                />
                <TooltipContent>
                  {quarter.done}/{quarter.total} task selesai, kontribusi {quarter.contribution}% ke tahun
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {goal.quarters.map((quarter) => (
          <QuarterCard
            key={quarter.quarter}
            quarter={quarter}
            tasks={goal.tasks.filter((task) => task.quarter === quarter.quarter)}
            goalId={goalId}
            run={run}
          />
        ))}
      </div>

      <EditGoalDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} run={run} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus goal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Goal "{goal.title}" beserta {goal.summary.total} task di dalamnya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteGoal}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface QuarterCardProps {
  quarter: QuarterSummary;
  tasks: Task[];
  goalId: number;
  run: Runner;
}

function QuarterCard({ quarter, tasks, goalId, run }: QuarterCardProps) {
  const [month, setMonth] = useState(String(quarter.months[0]));
  const [title, setTitle] = useState("");
  const perTask = quarter.total > 0 ? Math.round((100 / quarter.total) * 100) / 100 : 0;
  const monthItems = quarter.months.map((m) => ({ value: String(m), label: monthName(m) }));

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await run(
      () => api.createTask(goalId, { title: title.trim(), month: Number(month) }),
      "Task ditambahkan",
      "Gagal menambah task",
    );
    setTitle("");
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{quarter.label}</CardTitle>
          <span className="text-lg font-semibold tabular-nums text-primary">{quarter.progress}%</span>
        </div>
        <CardDescription>
          {monthName(quarter.months[0])} - {monthName(quarter.months[2])}
        </CardDescription>
        <Progress value={quarter.progress} className="mt-2" />
        <p className="text-xs text-muted-foreground">
          {quarter.done}/{quarter.total} task selesai
          {quarter.total > 0 ? `, tiap task ${perTask}% dari kuartal` : ""}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {quarter.months.map((m) => {
          const monthTasks = tasks.filter((task) => task.month === m);
          return (
            <div key={m} className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthName(m)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {monthTasks.filter((task) => task.status === "done").length}/{monthTasks.length}
                </span>
              </div>
              {monthTasks.length === 0 ? (
                <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
                  Belum ada task
                </p>
              ) : (
                <ul className="grid gap-1">
                  {monthTasks.map((task) => (
                    <TaskRow key={task.id} task={task} run={run} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <form onSubmit={handleAdd} className="mt-auto grid gap-2 border-t pt-3">
          <div className="flex gap-2">
            <Select value={month} onValueChange={(v) => v && setMonth(v)} items={monthItems}>
              <SelectTrigger size="sm" className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8"
              placeholder="Task baru"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" disabled={!title.trim()}>
            <Plus className="size-4" />
            Tambah task
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task, run }: { task: Task; run: Runner }) {
  const done = task.status === "done";
  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
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
        className={`flex-1 cursor-pointer text-sm font-normal ${done ? "text-muted-foreground line-through" : ""}`}
      >
        {task.title}
      </Label>
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await run(
      () => api.updateGoal(goal.id, { title: title.trim(), description: description.trim() || null }),
      "Goal diperbarui",
      "Gagal menyimpan goal",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>Ubah judul atau deskripsi goal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Judul</Label>
            <Input id="edit-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-desc">Deskripsi</Label>
            <Textarea
              id="edit-desc"
              rows={3}
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
