
CREATE TABLE public.rooms (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Jam Room',
  host_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#a78bfa',
  avatar TEXT NOT NULL DEFAULT '🎵',
  instrument TEXT NOT NULL DEFAULT 'Piano',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_code, user_id)
);

CREATE INDEX idx_room_members_room ON public.room_members(room_code);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_all" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_all" ON public.rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "members_select_all" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "members_insert_all" ON public.room_members FOR INSERT WITH CHECK (true);
CREATE POLICY "members_update_all" ON public.room_members FOR UPDATE USING (true);
CREATE POLICY "members_delete_all" ON public.room_members FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
