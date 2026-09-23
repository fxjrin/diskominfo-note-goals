import { CheckCircle2, Plus, Target, TrendingUp } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
import type { Goal } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - 1 + i));

export function GoalsPage() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

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

  function refresh() {
    setRefreshKey((key) => key + 1);
  }

  function changeYear(next: string | null) {
    if (!next) return;
    setYear(next);
    setLoading(true);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await api.deleteGoal(pendingDelete.id);
      toast.success(`Goal "${pendingDelete.title}" dihapus`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus goal");
    } finally {
      setPendingDelete(null);
    }
  }

  const avgProgress = goals.length
    ? Math.round((goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) * 100) / 100
    : 0;
  const completed = goals.filter((goal) => goal.progress >= 100).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals {year}</h1>
          <p className="text-sm text-muted-foreground">
            Setiap goal dipecah per kuartal dan per bulan. Progres dihitung otomatis dari task yang selesai.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={changeYear} items={YEARS.map((y) => ({ value: y, label: y }))}>
            <SelectTrigger className="w-28">
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
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Goal baru
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Target className="size-4" />} label="Total goal" value={String(goals.length)} />
        <StatCard icon={<TrendingUp className="size-4" />} label="Rata-rata progres" value={`${avgProgress}%`} />
        <StatCard icon={<CheckCircle2 className="size-4" />} label="Goal tercapai" value={String(completed)} />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Target className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Belum ada goal untuk {year}</p>
              <p className="text-sm text-muted-foreground">Mulai dengan menambahkan satu goal utama.</p>
            </div>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Tambah goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      <Link to={`/goals/${goal.id}`} className="hover:underline">
                        {goal.title}
                      </Link>
                    </CardTitle>
                    {goal.description && (
                      <CardDescription className="line-clamp-2">{goal.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={goal.progress >= 100 ? "default" : "secondary"}>
                    {goal.progress >= 100 ? "Tercapai" : "Berjalan"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progres</span>
                  <span className="font-semibold tabular-nums">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPendingDelete(goal)}>
                    Hapus
                  </Button>
                  <Button size="sm" nativeButton={false} render={<Link to={`/goals/${goal.id}`} />}>
                    Buka
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGoalDialog
        open={createOpen}
        year={Number(year)}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus goal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Goal "{pendingDelete?.title}" beserta semua task di dalamnya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.createGoal({ title: title.trim(), description: description.trim() || null, year });
      toast.success("Goal ditambahkan");
      setTitle("");
      setDescription("");
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
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Goal baru untuk {year}</DialogTitle>
            <DialogDescription>Satu hal yang ingin dicapai, misalnya "Belajar bahasa asing".</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="goal-title">Judul</Label>
            <Input id="goal-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-desc">Deskripsi (opsional)</Label>
            <Textarea
              id="goal-desc"
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
            <Button type="submit" disabled={submitting || !title.trim()}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
