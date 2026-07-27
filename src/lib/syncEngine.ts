import { db } from '../db';
import { supabase } from './supabase';
import { ALL_TABLES, syncRecordToCloud, deleteRecordFromCloud, mapCloudToLocal } from './sync';

let isSyncingFromCloud = false;
let engineStarted = false;

export function startBackgroundSync(userId: string) {
  if (!supabase || engineStarted) return;
  engineStarted = true;

  console.log('🚀 Starting Automatic Background Sync for user:', userId);

  // 1. Listen for Local Dexie changes and Push to Cloud
  ALL_TABLES.forEach((table) => {
    // When a new record is added locally
    (db[table] as any).hook('creating', (primKey: string, obj: any) => {
      if (isSyncingFromCloud) return;
      syncRecordToCloud(table, obj, userId).catch(console.error);
    });

    // When an existing record is updated locally
    (db[table] as any).hook('updating', (mods: any, primKey: string, obj: any) => {
      if (isSyncingFromCloud) return;
      // Dexie passes 'mods' which are the partial updates, we merge them into the full object
      const fullRecord = { ...obj, ...mods };
      syncRecordToCloud(table, fullRecord, userId).catch(console.error);
    });

    // When a record is deleted locally
    (db[table] as any).hook('deleting', (primKey: string) => {
      if (isSyncingFromCloud) return;
      deleteRecordFromCloud(table, primKey).catch(console.error);
    });
  });

  // 2. Listen for Cloud changes and Pull to Local
  ALL_TABLES.forEach((table) => {
    const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
    
    if (!supabase) return;
    supabase.channel(`public:${supabaseTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: supabaseTable, filter: `user_id=eq.${userId}` }, (payload) => {
        console.log(`☁️ Cloud change received for ${table}:`, payload.eventType);
        
        isSyncingFromCloud = true;
        
        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const localRecord = mapCloudToLocal(table, payload.new);
            (db[table] as any).put(localRecord).catch(console.error);
          } else if (payload.eventType === 'DELETE') {
            (db[table] as any).delete(payload.old.id).catch(console.error);
          }
        } finally {
          // Add a tiny delay to ensure the Dexie hook has completely finished firing before re-enabling outgoing sync
          setTimeout(() => {
            isSyncingFromCloud = false;
          }, 50);
        }
      })
      .subscribe();
  });
}
