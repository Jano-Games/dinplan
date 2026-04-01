import { supabase } from "@/lib/supabase";
import type { Task, Routine, Plan, Reminder, UserSettings, TaskStatus } from "@/types";
// date-fns used by pages directly

// ---- Tasks ----

export async function getTasks(date?: string): Promise<Task[]> {
  const query = supabase.from("tasks").select("*").order("sort_order", { ascending: true }).order("time_slot", { ascending: true });
  if (date) query.eq("date", date);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((t) => ({ ...t, id: String(t.id) }));
}

export async function addTask(t: Omit<Task, "id" | "user_id" | "created_at" | "completed_at">): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("tasks").insert({ ...t, user_id: user.id }).select().single();
  if (error) throw error;
  return { ...data, id: String(data.id) };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const { id: _id, ...rest } = updates as Record<string, unknown>;
  if (rest.status === "done") rest.completed_at = new Date().toISOString();
  const { error } = await supabase.from("tasks").update(rest).eq("id", Number(id));
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", Number(id));
  if (error) throw error;
}

export async function toggleTask(id: string, currentStatus: TaskStatus): Promise<void> {
  const newStatus = currentStatus === "done" ? "pending" : "done";
  await updateTask(id, {
    status: newStatus,
    ...(newStatus === "done" ? { completed_at: new Date().toISOString() } : { completed_at: undefined }),
  });
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  for (let i = 0; i < taskIds.length; i++) {
    await supabase.from("tasks").update({ sort_order: i }).eq("id", Number(taskIds[i]));
  }
}

// ---- Routines ----

export async function getRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase.from("routines").select("*").order("time_slot", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, id: String(r.id) }));
}

export async function addRoutine(r: Omit<Routine, "id" | "user_id" | "created_at">): Promise<Routine> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("routines").insert({ ...r, user_id: user.id }).select().single();
  if (error) throw error;
  return { ...data, id: String(data.id) };
}

export async function updateRoutine(id: string, updates: Partial<Routine>): Promise<void> {
  const { id: _id, ...rest } = updates as Record<string, unknown>;
  const { error } = await supabase.from("routines").update(rest).eq("id", Number(id));
  if (error) throw error;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from("routines").delete().eq("id", Number(id));
  if (error) throw error;
}

export async function generateTasksFromRoutines(date: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const routines = await getRoutines();
  const existingTasks = await getTasks(date);
  const dayOfWeek = new Date(date).getDay(); // 0=Sun, 6=Sat

  let count = 0;
  for (const routine of routines) {
    if (!routine.is_active) continue;

    // Check if already generated
    if (existingTasks.some((t) => t.routine_id === Number(routine.id))) continue;

    // Check recurrence
    let shouldGenerate = false;
    switch (routine.recurrence) {
      case "daily": shouldGenerate = true; break;
      case "weekdays": shouldGenerate = dayOfWeek >= 1 && dayOfWeek <= 5; break;
      case "weekends": shouldGenerate = dayOfWeek === 0 || dayOfWeek === 6; break;
      case "weekly": shouldGenerate = dayOfWeek === 6; break; // Saturday
      case "custom": shouldGenerate = routine.custom_days?.includes(dayOfWeek) ?? false; break;
      default: shouldGenerate = true;
    }

    if (shouldGenerate) {
      await addTask({
        title: routine.title,
        description: routine.description,
        date,
        time_slot: routine.time_slot,
        duration_minutes: routine.duration_minutes,
        priority: routine.priority,
        status: "pending",
        category: routine.category,
        routine_id: Number(routine.id),
        sort_order: count,
      });
      count++;
    }
  }
  return count;
}

// ---- Plans ----

export async function getPlans(date?: string): Promise<Plan[]> {
  const query = supabase.from("plans").select("*").order("date", { ascending: true }).order("start_time", { ascending: true });
  if (date) query.eq("date", date);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, id: String(p.id) }));
}

export async function addPlan(p: Omit<Plan, "id" | "user_id" | "created_at">): Promise<Plan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("plans").insert({ ...p, user_id: user.id }).select().single();
  if (error) throw error;
  return { ...data, id: String(data.id) };
}

export async function updatePlan(id: string, updates: Partial<Plan>): Promise<void> {
  const { id: _id, ...rest } = updates as Record<string, unknown>;
  const { error } = await supabase.from("plans").update(rest).eq("id", Number(id));
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", Number(id));
  if (error) throw error;
}

// ---- Reminders ----

export async function getReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase.from("reminders").select("*")
    .eq("is_dismissed", false)
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, id: String(r.id) }));
}

export async function getActiveReminders(): Promise<Reminder[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("reminders").select("*")
    .eq("is_fired", false)
    .eq("is_dismissed", false)
    .lte("remind_at", now)
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, id: String(r.id) }));
}

export async function addReminder(r: Omit<Reminder, "id" | "user_id" | "created_at" | "is_fired" | "is_dismissed">): Promise<Reminder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("reminders").insert({ ...r, user_id: user.id, is_fired: false, is_dismissed: false }).select().single();
  if (error) throw error;
  return { ...data, id: String(data.id) };
}

export async function dismissReminder(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").update({ is_dismissed: true, is_fired: true }).eq("id", Number(id));
  if (error) throw error;
}

export async function snoozeReminder(id: string, minutes: number): Promise<void> {
  const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const { error } = await supabase.from("reminders").update({ snooze_until: snoozeUntil, remind_at: snoozeUntil, is_fired: false }).eq("id", Number(id));
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", Number(id));
  if (error) throw error;
}

// ---- User Settings ----

export async function getUserSettings(): Promise<UserSettings | null> {
  const { data, error } = await supabase.from("user_settings").select("*").single();
  if (error) return null;
  return { ...data, id: String(data.id) };
}

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { id: _id, ...rest } = settings as Record<string, unknown>;
  const { data: existing } = await supabase.from("user_settings").select("id").eq("user_id", user.id).single();
  if (existing) {
    await supabase.from("user_settings").update(rest).eq("user_id", user.id);
  } else {
    await supabase.from("user_settings").insert({ ...rest, user_id: user.id });
  }
}
