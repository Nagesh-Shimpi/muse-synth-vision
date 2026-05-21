-- Virtual Instrument Vision AI - Database Schema
-- Run this in your Supabase SQL Editor if you wish to persist rooms and history.

-- 1. Users Table (Optional, if using Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Scanned Instruments History
CREATE TABLE IF NOT EXISTS public.scan_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- Nullable for guests
  image_url text NOT NULL,
  instrument_name text NOT NULL,
  family text NOT NULL,
  confidence numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, -- Store origin, era, history, etc.
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Multiplayer Rooms (If migrating from memory to DB for persistence)
CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY, -- E.g. 6 char code
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Room Participants Log (Optional analytics)
CREATE TABLE IF NOT EXISTS public.room_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  instrument_played text NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  left_at timestamp with time zone
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo purposes (modify for production!)
CREATE POLICY "Enable read access for all users" ON public.scan_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.scan_history FOR INSERT WITH CHECK (true);
