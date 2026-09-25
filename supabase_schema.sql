-- Roommate Chore Manager — Production Supabase PostgreSQL Database Schema & RLS Policies

-- 1. USERS / PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOUSES TABLE
CREATE TABLE IF NOT EXISTS public.houses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast case-insensitive invite_code lookups
CREATE INDEX IF NOT EXISTS idx_houses_invite_code ON public.houses (UPPER(invite_code));

-- 3. HOUSE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.house_members (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_house_members_house_id ON public.house_members (house_id);
CREATE INDEX IF NOT EXISTS idx_house_members_user_id ON public.house_members (user_id);

-- 4. CHORES TABLE
CREATE TABLE IF NOT EXISTS public.chores (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  chore_type TEXT NOT NULL DEFAULT 'SCHEDULED',
  frequency TEXT NOT NULL DEFAULT 'WEEKLY',
  sub_items JSONB DEFAULT '[]'::jsonb,
  has_sub_items BOOLEAN DEFAULT FALSE,
  assignment_mode TEXT DEFAULT 'AUTO_SCHEDULER',
  target_day TEXT,
  target_time TEXT,
  required_people INT DEFAULT 1,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  chore_id TEXT REFERENCES public.chores(id) ON DELETE CASCADE,
  actual_member_ids JSONB DEFAULT '[]'::jsonb,
  week_number INT NOT NULL,
  year INT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  source TEXT DEFAULT 'AUTO_SCHEDULER',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMPLETION EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.completion_events (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  chore_id TEXT REFERENCES public.chores(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  completed_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  completed_by_name TEXT NOT NULL,
  sub_item_id TEXT,
  sub_item_name TEXT,
  sub_item_ids JSONB DEFAULT '[]'::jsonb,
  sub_item_names JSONB DEFAULT '[]'::jsonb,
  completion_type TEXT DEFAULT 'ALONE',
  participants JSONB DEFAULT '[]'::jsonb,
  participant_names JSONB DEFAULT '[]'::jsonb,
  week_number INT NOT NULL,
  year INT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  last_edited_at TIMESTAMPTZ,
  last_edited_by_user_id TEXT
);

-- 7. ATTENTION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.attention_requests (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  chore_id TEXT REFERENCES public.chores(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  reported_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  reporter_names JSONB DEFAULT '[]'::jsonb,
  sub_item_id TEXT,
  sub_item_name TEXT,
  reason TEXT DEFAULT 'Bin is full / Needs attention',
  is_resolved BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ABSENCES TABLE
CREATE TABLE IF NOT EXISTS public.absences (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HOUSE HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public.house_holidays (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'House Holiday',
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  house_id TEXT REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- ROW LEVEL SECURITY (RLS) POLICIES ---
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attention_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public / anon reading of house invite codes for Join House lookup
DROP POLICY IF EXISTS "Public Invite Code Lookup" ON public.houses;
CREATE POLICY "Public Invite Code Lookup" ON public.houses FOR SELECT USING (true);

-- Allow authenticated house insertions & management
DROP POLICY IF EXISTS "Enable Insert Houses" ON public.houses;
CREATE POLICY "Enable Insert Houses" ON public.houses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable Select Members" ON public.house_members;
CREATE POLICY "Enable Select Members" ON public.house_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable Insert Members" ON public.house_members;
CREATE POLICY "Enable Insert Members" ON public.house_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable Select Users" ON public.users;
CREATE POLICY "Enable Select Users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable Upsert Users" ON public.users;
CREATE POLICY "Enable Upsert Users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Chores Access" ON public.chores;
CREATE POLICY "Enable Chores Access" ON public.chores FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Assignments Access" ON public.assignments;
CREATE POLICY "Enable Assignments Access" ON public.assignments FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Completions Access" ON public.completion_events;
CREATE POLICY "Enable Completions Access" ON public.completion_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Attention Access" ON public.attention_requests;
CREATE POLICY "Enable Attention Access" ON public.attention_requests FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Absences Access" ON public.absences;
CREATE POLICY "Enable Absences Access" ON public.absences FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Holidays Access" ON public.house_holidays;
CREATE POLICY "Enable Holidays Access" ON public.house_holidays FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable Notifications Access" ON public.notifications;
CREATE POLICY "Enable Notifications Access" ON public.notifications FOR ALL USING (true);
