-- ============================================
-- DinPlan V1 - Initial Schema
-- ============================================

-- Enums
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'skipped');
CREATE TYPE recurrence_type AS ENUM ('daily', 'weekdays', 'weekends', 'weekly', 'monthly', 'custom');
CREATE TYPE plan_status AS ENUM ('upcoming', 'in_progress', 'done', 'cancelled');
CREATE TYPE reminder_type AS ENUM ('task', 'plan', 'custom');

-- ============================================
-- 1. Tasks - Daily checklist items
-- ============================================
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_slot TIME,
  duration_minutes INTEGER,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  category TEXT DEFAULT 'general',
  routine_id INTEGER, -- links to routine if auto-generated
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Routines - Recurring task templates
-- ============================================
CREATE TABLE routines (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  time_slot TIME,
  duration_minutes INTEGER,
  priority task_priority DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  recurrence recurrence_type DEFAULT 'daily',
  custom_days INTEGER[], -- for 'custom': [0=Sun,1=Mon,...6=Sat]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Plans - Where to go, when, how long
-- ============================================
CREATE TABLE plans (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  travel_time_minutes INTEGER,
  departure_time TIME, -- auto-calculated or manual
  status plan_status DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Reminders - Notification scheduling
-- ============================================
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type reminder_type DEFAULT 'custom',
  reference_id INTEGER, -- task_id or plan_id
  title TEXT NOT NULL,
  body TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  is_fired BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. Push Subscriptions - Web Push
-- ============================================
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- ============================================
-- 6. User Settings
-- ============================================
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  timezone TEXT DEFAULT 'Asia/Dhaka',
  wake_time TIME DEFAULT '06:00',
  sleep_time TIME DEFAULT '23:00',
  notification_sound BOOLEAN DEFAULT true,
  full_screen_alarm BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_routines_user ON routines(user_id);
CREATE INDEX idx_plans_user_date ON plans(user_id, date);
CREATE INDEX idx_reminders_user_time ON reminders(user_id, remind_at);
CREATE INDEX idx_reminders_unfired ON reminders(is_fired, remind_at) WHERE is_fired = false;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE POLICY "Users manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Routines
CREATE POLICY "Users manage own routines" ON routines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plans
CREATE POLICY "Users manage own plans" ON plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users manage own reminders" ON reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push Subscriptions
CREATE POLICY "Users manage own push subs" ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Settings
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
