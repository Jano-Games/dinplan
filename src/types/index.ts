// ---- Enums ----
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';
export type RecurrenceType = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | 'custom';
export type PlanStatus = 'upcoming' | 'in_progress' | 'done' | 'cancelled';
export type ReminderType = 'task' | 'plan' | 'custom';

// ---- Models ----
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time_slot?: string;
  duration_minutes?: number;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  routine_id?: number;
  completed_at?: string;
  sort_order: number;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  time_slot?: string;
  duration_minutes?: number;
  priority: TaskPriority;
  category: string;
  recurrence: RecurrenceType;
  custom_days?: number[];
  is_active: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  travel_time_minutes?: number;
  departure_time?: string;
  status: PlanStatus;
  notes?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  type: ReminderType;
  reference_id?: number;
  title: string;
  body?: string;
  remind_at: string;
  is_fired: boolean;
  is_dismissed: boolean;
  snooze_until?: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  timezone: string;
  wake_time: string;
  sleep_time: string;
  notification_sound: boolean;
  full_screen_alarm: boolean;
  created_at: string;
}

// ---- Constants ----
export const TASK_CATEGORIES = [
  { value: 'general', label: 'General', icon: 'ClipboardList', color: 'text-primary' },
  { value: 'work', label: 'Work', icon: 'Briefcase', color: 'text-blue-500' },
  { value: 'health', label: 'Health', icon: 'Heart', color: 'text-rose-500' },
  { value: 'fitness', label: 'Fitness', icon: 'Dumbbell', color: 'text-orange-500' },
  { value: 'study', label: 'Study', icon: 'GraduationCap', color: 'text-violet-500' },
  { value: 'personal', label: 'Personal', icon: 'User', color: 'text-teal-500' },
  { value: 'home', label: 'Home', icon: 'Home', color: 'text-amber-600' },
  { value: 'errands', label: 'Errands', icon: 'ShoppingBag', color: 'text-pink-500' },
  { value: 'prayer', label: 'Prayer', icon: 'BookOpen', color: 'text-emerald-600' },
  { value: 'social', label: 'Social', icon: 'Users', color: 'text-cyan-500' },
];

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-secondary', dot: 'bg-muted-foreground' },
  medium: { label: 'Medium', color: 'text-blue-500', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  high: { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
};
