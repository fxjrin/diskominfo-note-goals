import { Plus, Trash2 } from "lucide-react";
import { DateRangePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRESETS, nextPeriodDraft, presetPeriods, type PresetKey } from "@/lib/dates";
import { periodError, weightTotal, type PeriodInput } from "@/types";

interface PeriodEditorProps {
  year: number;
  value: PeriodInput[];
  onChange: (value: PeriodInput[]) => void;
}

export function PeriodEditor({ year, value, onChange }: PeriodEditorProps) {
  const error = periodError(value, year);
  const total = weightTotal(value);

  function patch(index: number, changes: Partial<PeriodInput>) {
    onChange(value.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function applyPreset(key: PresetKey) {
    onChange(presetPeriods(key, year));
  }

  // Splits evenly and gives any rounding remainder to the last period so the total is exactly 100.
  function splitEvenly() {
    if (value.length === 0) return;
    const share = Math.floor((100 / value.length) * 100) / 100;
    onChange(
      value.map((p, index) => ({
        ...p,
        weight: index === value.length - 1 ? Math.round((100 - share * (value.length - 1)) * 100) / 100 : share,
      })),
    );
  }

  return (
    <div className="grid gap-3">
      <div>
        <Label>Pembagian periode tahun {year}</Label>
        <p className="text-xs text-muted-foreground">
          Bagi tahun ini menjadi beberapa periode sesuka Anda: kuartal, semester, bulanan, atau tahapan dengan
          tanggal sendiri. Bobot menentukan seberapa besar periode itu menyumbang ke progres tahunan.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Mulai dari:</span>
        {PRESETS.map((preset) => (
          <Button key={preset.key} type="button" variant="outline" size="xs" onClick={() => applyPreset(preset.key)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2 rounded-md border p-3">
        {value.length === 0 && <p className="text-sm text-muted-foreground">Belum ada periode.</p>}
        {value.map((period, index) => (
          <div key={period.id ?? `new-${index}`} className="grid gap-2 rounded-md bg-muted/40 p-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
            <Input
              value={period.name}
              maxLength={60}
              placeholder="Nama periode"
              aria-label={`Nama periode ${index + 1}`}
              className="h-8"
              onChange={(e) => patch(index, { name: e.target.value })}
            />
            <DateRangePicker
              start={period.startDate}
              end={period.endDate}
              year={year}
              onChange={(startDate, endDate) => patch(index, { startDate, endDate })}
              className="w-full sm:w-52"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="h-8 w-20 text-right"
                value={period.weight}
                aria-label={`Bobot ${period.name || `periode ${index + 1}`}`}
                onChange={(e) => patch(index, { weight: Number(e.target.value) || 0 })}
              />
              <span className="w-4 text-sm text-muted-foreground">%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Hapus periode ${period.name || index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, nextPeriodDraft(value, year)])}>
              <Plus className="size-4" />
              Tambah periode
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={splitEvenly} disabled={value.length === 0}>
              Bagi rata bobot
            </Button>
          </div>
          <span className={`text-sm ${error ? "font-medium text-destructive" : total < 99.99 ? "text-amber-700" : "text-muted-foreground"}`}>
            {error ?? (total < 99.99 ? `Total ${total}%, progres goal maksimal ${total}%` : "Total 100%")}
          </span>
        </div>
      </div>
    </div>
  );
}
