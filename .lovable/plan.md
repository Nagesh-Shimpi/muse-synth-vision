# Collaborative Music Ecosystem — Phased Plan

This is a large scope. I'll preserve everything existing (AI detection, audio engine, breath engine, instrument UI, design system) and layer new systems on top in phases. Recommend approving the plan, then I'll execute Phase 1 first and we iterate.

## Tech choice

**Supabase Realtime** (already wired via Lovable Cloud — no new infra, no extra secret, lowest latency path here). Socket.IO would require a separate Node server which this Cloudflare Worker stack can't host. Firebase would add a second backend.

- Presence channel → live participants + avatars + active-note indicators.
- Broadcast channel → note events (`{userId, instrument, note, velocity, t}`) at ~20–60ms latency.
- Postgres tables → rooms, room_members, lesson_progress.

## Phase 1 — Jam Rooms (multiplayer core)

New route `/jam` + `/jam/$roomCode`.
- Create room (6-char code) / join via code or shareable link.
- Anonymous "guest" identity (display name + color + emoji avatar) stored in localStorage — no auth gate, fastest path to playable. Auth can layer later.
- Supabase Realtime presence: participant list with instrument badge + live "playing" glow when they emit notes.
- Broadcast note events; remote notes routed through existing `audio-engine.ts` with a small `remote=true` flag so we skip local haptics but reuse samplers.
- Per-user instrument picker (reuses existing `InstrumentKey` set).
- Latency-aware: drop events older than 250ms, clamp scheduling via `Tone.now()+0.02`.

DB: `rooms(code, host_id, created_at)`, `room_members(room_code, user_id, display_name, color, instrument, joined_at)`. RLS: public read/insert on rooms (anonymous jam), members scoped by `user_id` cookie.

## Phase 2 — Learning Mode

New route `/learn`.
- Lesson library (seeded JSON, no DB needed initially): Piano basics, Guitar chords, Drum patterns, Sitar intro, etc.
- Lesson player overlays the existing `VirtualInstrument`:
  - highlighted next-note ring
  - chord shape overlay
  - "play this" → wait for correct input → advance
  - melody mode with tempo + score
- Progress tracker in `localStorage` first; sync to Supabase `lesson_progress` table when user is identified.

## Phase 3 — YouTube / Source Integration

New `/learn/import` flow.
- Paste YouTube URL → embed via `youtube-nocookie.com` iframe (no API key needed for embed).
- Paste tab/chord text → simple parser for `[C] [Am] [F] [G]` and ASCII tab → renders timed chord overlay on the instrument.
- "Sync mode": user taps a beat key on the first downbeat; we time-align chord markers to playback position via iframe postMessage `getCurrentTime`.

## Phase 4 — EdTech polish

- Progress dashboard (lessons completed, streaks).
- Cultural overlay cards for Sitar/Veena reusing existing detection metadata.
- Achievement micro-animations using existing motion system.

## Phase 5 — Multiplayer presence visuals

- Floating avatar bubbles around the instrument with their accent color.
- Note ripples in their color when they play.
- "Live room" pill in nav with participant count.

## Technical notes (for the technical reader)

- All realtime via `supabase.channel(roomCode, { config: { presence: { key: userId }, broadcast: { self: false, ack: false } }})`.
- Note payload kept tiny: `{n:"C4",i:"Piano",v:0.8}` — sub-100 bytes.
- Server functions only for room create/list (RLS-safe inserts). Note traffic stays peer-to-peer over Realtime, no serverFn hops.
- Mobile: same channel API, audio resume on visibility already handled in `audio-engine.ts`.
- No new env vars needed.

## What I need from you

1. **Approve the plan**, then I'll build **Phase 1 (Jam Rooms)** in this turn — that's the biggest unlock and unblocks Phase 2/3.
2. Confirm anonymous guest identity is OK for v1 (vs. requiring email/Google login up front). Default: guest mode.

Reply "go" and I'll start Phase 1.