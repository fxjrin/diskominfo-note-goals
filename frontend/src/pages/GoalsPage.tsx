import { CheckCircle2, ChevronRight, Download, Plus, Target, TrendingUp } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api/client";
import { PeriodEditor } from "@/components/PeriodEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { presetPeriods } from "@/lib/dates";
import { goalStatus, periodError, periodsLabel, type Goal, type PeriodInput } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - 1 + i));

export function GoalsPage() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listGoals(Number(year))
      .then((data) => {
        if (!cancelled) setGoals(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Gagal memuat goals");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, refreshKey]);

  function changeYear(next: string | null) {
    if (!next) return;
    setYear(next);
    setLoading(true);
  }

  async function exportCsv() {
    try {
      await api.downloadCsv(`/export/goals?year=${year}`, `goals-${year}.csv`);
      toast.success("File CSV diunduh");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunduh CSV");
    }
  }

  const avgProgress = goals.length
    ? Math.round((goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) * 100) / 100
    : 0;
  const achieved = goals.filter((goal) => goalStatus(goal.progress, goal.summary.total).tone === "done").length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals tahun {year}</h1>
          <p className="text-sm text-muted-foreground">Pilih goal untuk melihat dan mencentang task-nya.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={changeYear} items={YEARS.map((y) => ({ value: y, label: y }))}>
            <SelectTrigger className="w-28" aria-label="Tahun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv} disabled={goals.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Goal baru
          </Button>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Target className="size-4" />} label="Jumlah goal" value={String(goals.length)} />
          <StatCard icon={<TrendingUp className="size-4" />} label="Rata-rata progres" value={`${avgProgress}%`} />
          <StatCard icon={<CheckCircle2 className="size-4" />} label="Sudah tercapai" value={String(achieved)} />
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="grid gap-5 py-10">
            <div className="text-center">
              <Target className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="font-medium">Belum ada goal untuk tahun {year}</p>
              <p className="text-sm text-muted-foreground">Begini cara kerjanya:</p>
            </div>
            <ol className="mx-auto grid max-w-md gap-2 text-sm text-muted-foreground">
              {[
                'Buat satu goal, misalnya "Belajar bahasa asing", lalu bagi tahunnya menjadi beberapa periode.',
                "Isi task di tiap periode lengkap dengan tanggalnya.",
                "Centang task yang selesai. Persentase progres naik otomatis.",
              ].map((text, index) => (
                <li key={text} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
            <Button className="mx-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Buat goal pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <CreateGoalDialog
        open={createOpen}
        year={Number(year)}
        onOpenChange={setCreateOpen}
        onCreated={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const status = goalStatus(goal.progress, goal.summary.total);
  return (
    <Link to={`/goals/${goal.id}`} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-semibold group-hover:underline">{goal.title}</h2>
              {goal.description && <p className="line-clamp-1 text-sm text-muted-foreground">{goal.description}</p>}
            </div>
            <StatusBadge tone={status.tone} label={status.label} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {goal.summary.total === 0
                ? "Belum ada task"
                : `${goal.summary.done} dari ${goal.summary.total} task selesai`}
            </div>
            <span className="text-xl font-semibold tabular-nums">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{periodsLabel(goal.periods)}</span>
            <span className="flex items-center gap-1 text-primary">
              Buka <ChevronRight className="size-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function StatusBadge({ tone, label }: { tone: "done" | "active" | "idle"; label: string }) {
  const variant = tone === "done" ? "default" : tone === "active" ? "secondary" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      </CardContent>
    </Card>
  );
}

interface CreateGoalDialogProps {
  open: boolean;
  year: number;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateGoalDialog({ open, year, onOpenChange, onCreated }: CreateGoalDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [periods, setPeriods] = useState<PeriodInput[]>(() => presetPeriods("quarters", year));
  const [submitting, setSubmitting] = useState(false);
  const invalid = periodError(periods, year);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.createGoal({ title: title.trim(), description: description.trim() || null, year, periods });
      toast.success("Goal dibuat. Sekarang tambahkan task-nya.");
      setTitle("");
      setDescription("");
      setPeriods(presetPeriods("quarters", year));
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat goal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Goal baru untuk {year}</DialogTitle>
            <DialogDescription>Satu hal yang ingin dicapai tahun ini.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="goal-title">Nama goal</Label>
            <Input
              id="goal-title"
              placeholder="mis. Belajar bahasa asing"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-desc">Keterangan (opsional)</Label>
            <Textarea
              id="goal-desc"
              rows={2}
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <PeriodEditor year={year} value={periods} onChange={setPeriods} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || invalid !== null}>
              Buat goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
