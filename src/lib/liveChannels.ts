import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** Central channel names for live lecture realtime (broadcast + presence).
 *  Reactions now share the lecture-sync channel to cut total channel count. */
export const liveChannelNames = {
  lectureSync: (lectureId: string) => `lecture-sync-${lectureId}`,
  /** @deprecated reactions are now sent via lectureSync as event `emoji_reaction`. Kept for reference only. */
  reactions: (lectureId: string) => `lecture-sync-${lectureId}`,
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

/**
 * @deprecated Reactions now piggyback on the lecture-sync channel.
 * Callers should subscribe to `emoji_reaction` on the sync channel instead.
 * This helper returns the SAME channel name as createLectureSyncChannel.
 */
export function createReactionsChannel(lectureId: string): RealtimeChannel {
  return supabase.channel(liveChannelNames.lectureSync(lectureId), {
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
