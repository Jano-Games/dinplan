import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getTasks, addTask, updateTask, deleteTask, toggleTask, generateTasksFromRoutines } from "@/lib/store";
import { TASK_CATEGORIES, PRIORITY_CONFIG } from "@/types";
import type { TaskPriority } from "@/types";
import { Plus, Check, Trash2, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight, Loader2, Pencil, SkipForward } from "lucide-react";
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@/hooks/useQuery";
import { supabase } from "@/lib/supabase";


export default function Tasks() {
  const [currentDate, setCurrentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: tasks = [], refresh, loading } = useQuery(() => getTasks(currentDate));
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState("general");
  const [addLoading, setAddLoading] = useState(false);
  const [userName, setUserName] = useState("");

  const [detailTask, setDetailTask] = useState<typeof tasks[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", time_slot: "", duration_minutes: "", priority: "medium" as TaskPriority, category: "general" });
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name || data.user?.email || "";
      setUserName(name.split(" ")[0]);
    });
  }, []);

  // Auto-generate routine tasks for today
  useEffect(() => {
    if (isToday(new Date(currentDate))) {
      generateTasksFromRoutines(currentDate).then((count) => {
        if (count > 0) refresh();
      }).catch(() => {});
    }
  }, [currentDate]);

  const dateLabel = useMemo(() => {
    const d = new Date(currentDate);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, d MMM");
  }, [currentDate]);

  const prevDay = () => setCurrentDate((d) => format(subDays(new Date(d), 1), "yyyy-MM-dd"));
  const nextDay = () => setCurrentDate((d) => format(addDays(new Date(d), 1), "yyyy-MM-dd"));

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const handleAdd = async () => {
    if (!title.trim()) { toast.error("Enter a task title"); return; }
    setAddLoading(true);
    try {
      await addTask({
        title: title.trim(),
        date: currentDate,
        time_slot: timeSlot || undefined,
        duration_minutes: duration ? parseInt(duration) : undefined,
        priority,
        status: "pending",
        category,
        sort_order: tasks.length,
      });
      toast.success("Task added!");
      setTitle(""); setTimeSlot(""); setDuration(""); setPriority("medium"); setCategory("general");
      setAddOpen(false); refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setAddLoading(false); }
  };

  const handleToggle = async (task: typeof tasks[0]) => {
    try {
      await toggleTask(task.id, task.status);
      refresh();
    } catch { toast.error("Failed"); }
  };

  const handleSkip = async (task: typeof tasks[0]) => {
    try {
      await updateTask(task.id, { status: "skipped" });
      toast.success("Skipped");
      refresh();
    } catch { toast.error("Failed"); }
  };

  const openEdit = (task: typeof tasks[0]) => {
    setEditForm({
      title: task.title,
      time_slot: task.time_slot || "",
      duration_minutes: task.duration_minutes ? String(task.duration_minutes) : "",
      priority: task.priority,
      category: task.category,
    });
    setDetailTask(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!detailTask && !editOpen) return;
    const taskId = detailTask?.id;
    if (!taskId && !editOpen) return;
    setEditLoading(true);
    try {
      const id = taskId || (detailTask?.id ?? "");
      await updateTask(id, {
        title: editForm.title.trim(),
        time_slot: editForm.time_slot || undefined,
        duration_minutes: editForm.duration_minutes ? parseInt(editForm.duration_minutes) : undefined,
        priority: editForm.priority,
        category: editForm.category,
      });
      toast.success("Updated");
      setEditOpen(false); refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setEditLoading(false); }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Done/skipped go to bottom
      const aDone = a.status === "done" || a.status === "skipped" ? 1 : 0;
      const bDone = b.status === "done" || b.status === "skipped" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      // Then by time
      if (a.time_slot && b.time_slot) return a.time_slot.localeCompare(b.time_slot);
      if (a.time_slot) return -1;
      if (b.time_slot) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [tasks]);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMM yyyy")}</p>
        <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
          {greeting}{userName ? `, ${userName}` : ""}
        </h1>
      </div>

      {/* Date Picker */}
      <div className="flex items-center justify-between">
        <button onClick={prevDay} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setCurrentDate(format(new Date(), "yyyy-MM-dd"))} className="text-sm font-bold hover:text-primary transition-colors">
          {dateLabel}
        </button>
        <button onClick={nextDay} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Card */}
      {totalCount > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Progress</p>
            <span className="text-xs font-bold text-primary">{completedCount}/{totalCount} done</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {progress === 100 && <p className="text-xs text-primary font-semibold mt-2">🎉 All tasks completed!</p>}
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-card border border-border/50 animate-pulse" />)}
        </div>
      ) : sortedTasks.length > 0 ? (
        <div className="space-y-2">
          {sortedTasks.map((task) => {
            const isDone = task.status === "done";
            const isSkipped = task.status === "skipped";
            const catInfo = TASK_CATEGORIES.find((c) => c.value === task.category);
            const priInfo = PRIORITY_CONFIG[task.priority];

            return (
              <div
                key={task.id}
                className={`rounded-2xl bg-card border border-border/50 px-4 py-3.5 flex items-center gap-3 transition-all ${
                  isDone || isSkipped ? "opacity-50" : ""
                }`}
              >
                {/* Checkbox */}
                <button onClick={() => handleToggle(task)} className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" strokeWidth={2} />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground/40 hover:text-primary transition-colors" strokeWidth={1.5} />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTask(task)}>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${isDone ? "line-through text-muted-foreground" : isSkipped ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    {task.priority !== "medium" && (
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${priInfo.dot}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.time_slot && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {task.time_slot.slice(0, 5)}
                      </span>
                    )}
                    {task.duration_minutes && (
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                        {task.duration_minutes}m
                      </span>
                    )}
                    {catInfo && catInfo.value !== "general" && (
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                        {catInfo.label}
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-semibold">Skipped</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold">No tasks</h3>
          <p className="text-sm text-muted-foreground mt-1.5">Tap + to add a task for {dateLabel.toLowerCase()}</p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-5 z-50 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 hover:shadow-xl hover:shadow-primary/40 active:scale-95 transition-all duration-200"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Add Task Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 max-h-[90vh] overflow-y-auto scrollbar-hide" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          <SheetHeader className="p-0 pb-4"><SheetTitle className="text-xl font-bold">Add Task</SheetTitle></SheetHeader>
          <div className="space-y-4 mb-5">
            <div>
              <Label className="label-caps text-muted-foreground">What to do?</Label>
              <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps text-muted-foreground">Time</Label>
                <Input type="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
              <div>
                <Label className="label-caps text-muted-foreground">Duration (min)</Label>
                <Input type="number" placeholder="30" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Priority</Label>
              <div className="flex gap-2 mt-2">
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button key={p} onClick={() => setPriority(p)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${priority === p ? `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].color}` : "bg-secondary text-muted-foreground"}`}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Category</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {TASK_CATEGORIES.map((cat) => (
                  <button key={cat.value} onClick={() => setCategory(cat.value)} className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all ${category === cat.value ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={addLoading} className="w-full h-14 text-base font-bold rounded-2xl">
            {addLoading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Adding...</> : "Add Task"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* Task Detail Sheet */}
      <Sheet open={!!detailTask} onOpenChange={(v) => { if (!v) setDetailTask(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          {detailTask && (() => {
            const catInfo = TASK_CATEGORIES.find((c) => c.value === detailTask.category);
            const priInfo = PRIORITY_CONFIG[detailTask.priority];
            return (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">{detailTask.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${priInfo.bg} ${priInfo.color}`}>{priInfo.label}</span>
                    {catInfo && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{catInfo.label}</span>}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${detailTask.status === "done" ? "bg-primary/10 text-primary" : detailTask.status === "skipped" ? "bg-amber-500/10 text-amber-500" : "bg-secondary text-muted-foreground"}`}>
                      {detailTask.status}
                    </span>
                  </div>
                </div>

                {(detailTask.time_slot || detailTask.duration_minutes) && (
                  <div className="rounded-2xl bg-secondary/40 p-4 space-y-2">
                    {detailTask.time_slot && (
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="text-sm font-medium">{detailTask.time_slot.slice(0, 5)}</span></div>
                    )}
                    {detailTask.duration_minutes && (
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Duration</span><span className="text-sm font-medium">{detailTask.duration_minutes} min</span></div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => { handleToggle(detailTask); setDetailTask(null); }} className="flex-1 h-12 rounded-2xl font-bold gap-1.5">
                    {detailTask.status === "done" ? <><Circle className="h-4 w-4" /> Undo</> : <><Check className="h-4 w-4" /> Done</>}
                  </Button>
                  {detailTask.status !== "skipped" && detailTask.status !== "done" && (
                    <Button variant="outline" onClick={() => { handleSkip(detailTask); setDetailTask(null); }} className="h-12 rounded-2xl font-bold gap-1.5 px-4">
                      <SkipForward className="h-4 w-4" /> Skip
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { const t = detailTask; setDetailTask(null); openEdit(t); setEditOpen(true); }} className="flex-1 h-12 rounded-2xl font-bold">
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" disabled={deletingId === detailTask.id} onClick={async () => { setDeletingId(detailTask.id); try { await deleteTask(detailTask.id); toast.success("Deleted"); setDetailTask(null); refresh(); } catch { toast.error("Failed"); } finally { setDeletingId(null); } }} className="flex-1 h-12 rounded-2xl font-bold">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 max-h-[90vh] overflow-y-auto scrollbar-hide" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          <SheetHeader className="p-0 pb-4"><SheetTitle className="text-xl font-bold">Edit Task</SheetTitle></SheetHeader>
          <div className="space-y-4 mb-5">
            <div>
              <Label className="label-caps text-muted-foreground">Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm(p => ({ ...p, title: e.target.value }))} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps text-muted-foreground">Time</Label>
                <Input type="time" value={editForm.time_slot} onChange={(e) => setEditForm(p => ({ ...p, time_slot: e.target.value }))} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
              <div>
                <Label className="label-caps text-muted-foreground">Duration (min)</Label>
                <Input type="number" value={editForm.duration_minutes} onChange={(e) => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Priority</Label>
              <div className="flex gap-2 mt-2">
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button key={p} onClick={() => setEditForm(f => ({ ...f, priority: p }))} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${editForm.priority === p ? `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].color}` : "bg-secondary text-muted-foreground"}`}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleEdit} disabled={editLoading} className="w-full h-14 text-base font-bold rounded-2xl">{editLoading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Saving...</> : "Save Changes"}</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ClipboardList(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
    </svg>
  );
}
