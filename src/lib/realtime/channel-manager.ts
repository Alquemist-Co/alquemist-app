"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

const activeChannels = new Map<string, RealtimeChannel>();

export function subscribeChannel(
  supabase: SupabaseClient,
  channelName: string,
  config: {
    table: string;
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    filter?: string;
    callback: (payload: Record<string, unknown>) => void;
  },
): RealtimeChannel {
  // Reuse existing channel if already subscribed
  const existing = activeChannels.get(channelName);
  if (existing) return existing;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: config.event ?? "*",
        schema: "public",
        table: config.table,
        filter: config.filter,
      },
      (payload) => {
        config.callback(payload.new as Record<string, unknown>);
      },
    )
    .subscribe();

  activeChannels.set(channelName, channel);
  return channel;
}

export function unsubscribeChannel(
  supabase: SupabaseClient,
  channelName: string,
): void {
  const channel = activeChannels.get(channelName);
  if (channel) {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  }
}

export function unsubscribeAll(supabase: SupabaseClient): void {
  for (const [name, channel] of activeChannels) {
    supabase.removeChannel(channel);
    activeChannels.delete(name);
  }
}
