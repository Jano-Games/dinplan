import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getRoutines, addRoutine, updateRoutine, deleteRoutine } from "@/lib/store";
import { TASK_CATEGORIES, PRIORITY_CONFIG } from "@/types";
import type { TaskPriority, RecurrenceType } from "@/types";
import { Plus, Trash2, Pause, Play, Repeat, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@/hooks/useQuery";

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "daily", label: "Every Day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Routines() {
  const { data: routines = [], refresh, loading } = useQuery(getRoutines);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", time_slot: "", duration: "", priority: "medium" as TaskPriority,
    category: "general", recurrence: "daily" as RecurrenceType, custom_days: [] as number[],
  });
  const [addLoading, setAddLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const setField = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      custom_days: f.custom_days.includes(day) ? f.custom_days.filter((d) => d !== day) : [...f.custom_days, day],
    }));
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error("Enter a title"); return; }
    setAddLoading(true);
    try {
      await addRoutine({
        title: form.title.trim(),
        time_slot: form.time_slot || undefined,
        duration_minutes: form.duration ? parseInt(form.duration) : undefined,
        priority: form.priority,
        category: form.category,
        recurrence: form.recurrence,
        custom_days: form.recurrence === "custom" ? form.custom_days : undefined,
        is_active: true,
      });
      toast.success("Routine created!");
      setForm({ title: "", time_slot: "", duration: "", priority: "medium", category: "general", recurrence: "daily", custom_days: [] });
      setAddOpen(false); refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setAddLoading(false); }
  };

  const handleToggle = async (routine: typeof routines[0]) => {
    setTogglingId(routine.id);
    try {
      await updateRoutine(routine.id, { is_active: !routine.is_active });
      toast.success(routine.is_active ? "Paused" : "Resumed");
      refresh();
    } catch { toast.error("Failed"); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRoutine(id);
      toast.success("Deleted");
      refresh();
    } catch { toast.error("Failed"); }
    finally { setDeletingId(null); }
  };

  const activeRoutines = routines.filter((r) => r.is_active);
  const pausedRoutines = routines.filter((r) => !r.is_active);

  const getRecurrenceLabel = (r: typeof routines[0]) => {
    if (r.recurrence === "custom" && r.custom_days?.length) {
      return r.custom_days.map((d) => DAY_NAMES[d]).join(", ");
    }
    return RECURRENCE_OPTIONS.find((o) => o.value === r.recurrence)?.label || r.recurrence;
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Routines</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-card border border-border/50 animate-pulse" />)}
        </div>
      ) : (
        <>
          {activeRoutines.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-caps text-muted-foreground">Active ({activeRoutines.length})</h3>
              {activeRoutines.map((routine) => {
                const catInfo = TASK_CATEGORIES.find((c) => c.value === routine.category);
                const priInfo = PRIORITY_CONFIG[routine.priority];
                return (
                  <div key={routine.id} className="rounded-2xl bg-card border border-border/50 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{routine.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary flex items-center gap-0.5">
                            <Repeat className="h-3 w-3" /> {getRecurrenceLabel(routine)}
                          </span>
                          {routine.time_slot && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {routine.time_slot.slice(0, 5)}
                            </span>
                          )}
                          {routine.duration_minutes && (
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">{routine.duration_minutes}m</span>
                          )}
                          {catInfo && catInfo.value !== "general" && (
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">{catInfo.label}</span>
                          )}
                          {routine.priority !== "medium" && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${priInfo.bg} ${priInfo.color}`}>{priInfo.label}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button disabled={togglingId === routine.id} onClick={() => handleToggle(routine)} className="text-muted-foreground/40 hover:text-amber-500 p-1.5 transition-colors">
                          <Pause className="h-4 w-4" />
                        </button>
                        <button disabled={deletingId === routine.id} onClick={() => handleDelete(routine.id)} className="text-muted-foreground/40 hover:text-destructive p-1.5 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pausedRoutines.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-caps text-muted-foreground">Paused</h3>
              {pausedRoutines.map((routine) => (
                <div key={routine.id} className="rounded-2xl bg-card border border-border/50 p-4 opacity-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{routine.title}</p>
                    <div className="flex items-center gap-1">
                      <button disabled={togglingId === routine.id} onClick={() => handleToggle(routine)} className="text-muted-foreground hover:text-primary p-1.5">
                        <Play className="h-4 w-4" />
                      </button>
                      <button disabled={deletingId === routine.id} onClick={() => handleDelete(routine.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {routines.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Repeat className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold">No routines yet</h3>
              <p className="text-sm text-muted-foreground mt-1.5">Create recurring tasks that auto-generate daily</p>
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button onClick={() => setAddOpen(true)} className="fixed bottom-20 right-5 z-50 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Add Routine Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 max-h-[90vh] overflow-y-auto scrollbar-hide" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          <SheetHeader className="p-0 pb-4"><SheetTitle className="text-xl font-bold">Create Routine</SheetTitle></SheetHeader>
          <div className="space-y-4 mb-5">
            <div>
              <Label className="label-caps text-muted-foreground">Title</Label>
              <Input placeholder="e.g. Morning exercise" value={form.title} onChange={(e) => setField("title", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Repeat</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setField("recurrence", opt.value)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${form.recurrence === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {form.recurrence === "custom" && (
              <div>
                <Label className="label-caps text-muted-foreground">Select Days</Label>
                <div className="flex gap-2 mt-2">
                  {DAY_NAMES.map((day, i) => (
                    <button key={i} onClick={() => toggleDay(i)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${form.custom_days.includes(i) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps text-muted-foreground">Time</Label>
                <Input type="time" value={form.time_slot} onChange={(e) => setField("time_slot", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
              <div>
                <Label className="label-caps text-muted-foreground">Duration (min)</Label>
                <Input type="number" placeholder="30" value={form.duration} onChange={(e) => setField("duration", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Priority</Label>
              <div className="flex gap-2 mt-2">
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button key={p} onClick={() => setField("priority", p)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${form.priority === p ? `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].color}` : "bg-secondary text-muted-foreground"}`}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Category</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {TASK_CATEGORIES.map((cat) => (
                  <button key={cat.value} onClick={() => setField("category", cat.value)} className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all ${form.category === cat.value ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={addLoading} className="w-full h-14 text-base font-bold rounded-2xl">
            {addLoading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Creating...</> : "Create Routine"}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
