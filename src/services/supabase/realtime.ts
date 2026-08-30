import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

export type RealtimeChangeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new: any;
  old: any;
}) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  public subscribeToTable(
    table: string,
    onEvent: RealtimeChangeCallback
  ): () => void {
    const client = getSupabaseClient();
    if (!client) {
      return () => {};
    }

    const channelName = `realtime_${table}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      const channel = client
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload: any) => {
            onEvent({
              eventType: payload.eventType,
              table,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);

      return () => {
        try {
          client.removeChannel(channel);
          this.channels.delete(channelName);
        } catch (e) {
          console.warn(`[Realtime] Error unsubscribing from ${table}:`, e);
        }
      };
    } catch (e) {
      console.warn(`[Realtime] Error subscribing to ${table}:`, e);
      return () => {};
    }
  }

  public unsubscribeAll(): void {
    const client = getSupabaseClient();
    if (!client) return;

    this.channels.forEach((channel) => {
      try {
        client.removeChannel(channel);
      } catch (_) {}
    });
    this.channels.clear();
  }
}

export const realtimeManager = new RealtimeService();
