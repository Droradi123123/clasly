import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** Central channel names for live lecture realtime (broadcast + presence). */
export const liveChannelNames = {
  lectureSync: (lectureId: string) => `lecture-sync-${lectureId}`,
  reactions: (lectureId: string) => `reactions-${lectureId}`,
  game: (lectureId: string) => `game-${lectureId}`,
  /** Supabase Presence: who is online now (students track; presenter subscribes only). */
  lecturePresence: (lectureId: string) => `lecture-presence-${lectureId}`,
} as const;

export type LecturePresenceMeta = {
  studentId: string;
  name: string;
  emoji: string;
  joinedAt: string;
};

/** Broadcast-only config used by presenter → students slide sync and response hints. */
export function createLectureSyncChannel(lectureId: string): RealtimeChannel {
  return supabase.channel(liveChannelNames.lectureSync(lectureId), {
    config: { broadcast: { self: false } },
  });
}

export function createReactionsChannel(lectureId: string): RealtimeChannel {
  return supabase.channel(liveChannelNames.reactions(lectureId), {
    config: { broadcast: { self: false } },
  });
}

export function createGameChannel(lectureId: string): RealtimeChannel {
  return supabase.channel(liveChannelNames.game(lectureId), {
    config: { broadcast: { self: true } },
  });
}

/** Student: track presence with stable key per browser session row. */
export function createStudentPresenceChannel(
  lectureId: string,
  presenceKey: string
): RealtimeChannel {
  return supabase.channel(liveChannelNames.lecturePresence(lectureId), {
    config: { presence: { key: presenceKey } },
  });
}

/** Presenter: same room, no local track — only receives presence sync. */
export function createPresenterPresenceChannel(lectureId: string): RealtimeChannel {
  return supabase.channel(liveChannelNames.lecturePresence(lectureId));
}

/** Online count: one presence key per tracked student (presenter does not track). */
export function countPresenceOnline(presenceState: Record<string, unknown[]>): number {
  return Object.keys(presenceState).length;
}

/** Names from presence for raffle (presence key = studentId). */
export function presenceNamesList(presenceState: Record<string, unknown[]>): { studentId: string; name: string }[] {
  return Object.entries(presenceState).map(([studentId, presences]) => {
    const first = (presences as { name?: string }[])?.[0];
    return { studentId, name: typeof first?.name === "string" ? first.name : "Guest" };
  });
}
