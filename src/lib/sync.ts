import { db } from '../db';
import { supabase } from './supabase';

export const ALL_TABLES = ['categories', 'locations', 'groups', 'formulas', 'items', 'savedSearches', 'sets'] as const;

export function mapLocalToCloud(table: string, record: any, userId: string) {
  const dbRecord = { ...record, user_id: userId };
  
  if (table === 'categories' && 'fieldTemplate' in dbRecord) {
    dbRecord.field_template = dbRecord.fieldTemplate; delete dbRecord.fieldTemplate;
  }
  if (table === 'items') {
    if ('categoryId' in dbRecord) { dbRecord.category_id = dbRecord.categoryId; delete dbRecord.categoryId; }
    if ('groupId' in dbRecord) { dbRecord.group_id = dbRecord.groupId; delete dbRecord.groupId; }
    if ('locationId' in dbRecord) { dbRecord.location_id = dbRecord.locationId; delete dbRecord.locationId; }
    if ('productLinkId' in dbRecord) { dbRecord.product_link_id = dbRecord.productLinkId; delete dbRecord.productLinkId; }
    if ('lowStockThreshold' in dbRecord) { dbRecord.low_stock_threshold = dbRecord.lowStockThreshold; delete dbRecord.lowStockThreshold; }
    if ('originalQuantity' in dbRecord) { dbRecord.original_quantity = dbRecord.originalQuantity; delete dbRecord.originalQuantity; }
    if ('priceEditLog' in dbRecord) { dbRecord.price_edit_log = dbRecord.priceEditLog; delete dbRecord.priceEditLog; }
    if ('trackUsage' in dbRecord) { dbRecord.track_usage = dbRecord.trackUsage; delete dbRecord.trackUsage; }
    if ('usageLog' in dbRecord) { dbRecord.usage_log = dbRecord.usageLog; delete dbRecord.usageLog; }
    if ('purchaseDate' in dbRecord) { dbRecord.purchase_date = dbRecord.purchaseDate; delete dbRecord.purchaseDate; }
    if ('purchasePrice' in dbRecord) { dbRecord.purchase_price = dbRecord.purchasePrice; delete dbRecord.purchasePrice; }
    if ('statusHistory' in dbRecord) { dbRecord.status_history = dbRecord.statusHistory; delete dbRecord.statusHistory; }
    if ('auditLog' in dbRecord) { dbRecord.audit_log = dbRecord.auditLog; delete dbRecord.auditLog; }
    if ('manualLifespanDays' in dbRecord) { dbRecord.manual_lifespan_days = dbRecord.manualLifespanDays; delete dbRecord.manualLifespanDays; }
  }
  if (table === 'locations' && 'parentLocationId' in dbRecord) {
    dbRecord.parent_location_id = dbRecord.parentLocationId; delete dbRecord.parentLocationId;
  }
  if (table === 'groups' && 'categoryId' in dbRecord) {
    dbRecord.category_id = dbRecord.categoryId; delete dbRecord.categoryId;
  }
  if (table === 'formulas' && 'categoryId' in dbRecord) {
    dbRecord.category_id = dbRecord.categoryId; delete dbRecord.categoryId;
  }
  if (table === 'savedSearches' && 'filterConfig' in dbRecord) {
    dbRecord.filter_config = dbRecord.filterConfig; delete dbRecord.filterConfig;
  }
  if (table === 'sets') {
    if ('categoryScope' in dbRecord) { dbRecord.category_scope = dbRecord.categoryScope; delete dbRecord.categoryScope; }
    if ('itemIds' in dbRecord) { dbRecord.item_ids = dbRecord.itemIds; delete dbRecord.itemIds; }
  }

  if ('createdAt' in dbRecord) { dbRecord.created_at = dbRecord.createdAt; delete dbRecord.createdAt; }
  if ('updatedAt' in dbRecord) { dbRecord.updated_at = dbRecord.updatedAt; delete dbRecord.updatedAt; }

  return dbRecord;
}

export function mapCloudToLocal(table: string, record: any) {
  const localRecord = { ...record };
  delete localRecord.user_id;

  if (table === 'categories' && 'field_template' in localRecord) {
    localRecord.fieldTemplate = localRecord.field_template; delete localRecord.field_template;
  }
  if (table === 'items') {
    if ('category_id' in localRecord) { localRecord.categoryId = localRecord.category_id; delete localRecord.category_id; }
    if ('group_id' in localRecord) { localRecord.groupId = localRecord.group_id; delete localRecord.group_id; }
    if ('location_id' in localRecord) { localRecord.locationId = localRecord.location_id; delete localRecord.location_id; }
    if ('product_link_id' in localRecord) { localRecord.productLinkId = localRecord.product_link_id; delete localRecord.product_link_id; }
    if ('low_stock_threshold' in localRecord) { localRecord.lowStockThreshold = localRecord.low_stock_threshold; delete localRecord.low_stock_threshold; }
    if ('original_quantity' in localRecord) { localRecord.originalQuantity = localRecord.original_quantity; delete localRecord.original_quantity; }
    if ('price_edit_log' in localRecord) { localRecord.priceEditLog = localRecord.price_edit_log; delete localRecord.price_edit_log; }
    if ('track_usage' in localRecord) { localRecord.trackUsage = localRecord.track_usage; delete localRecord.track_usage; }
    if ('usage_log' in localRecord) { localRecord.usageLog = localRecord.usage_log; delete localRecord.usage_log; }
    if ('purchase_date' in localRecord) { localRecord.purchaseDate = localRecord.purchase_date; delete localRecord.purchase_date; }
    if ('purchase_price' in localRecord) { localRecord.purchasePrice = localRecord.purchase_price; delete localRecord.purchase_price; }
    if ('status_history' in localRecord) { localRecord.statusHistory = localRecord.status_history; delete localRecord.status_history; }
    if ('audit_log' in localRecord) { localRecord.auditLog = localRecord.audit_log; delete localRecord.audit_log; }
    if ('manual_lifespan_days' in localRecord) { localRecord.manualLifespanDays = localRecord.manual_lifespan_days; delete localRecord.manual_lifespan_days; }
  }
  if (table === 'locations' && 'parent_location_id' in localRecord) {
    localRecord.parentLocationId = localRecord.parent_location_id; delete localRecord.parent_location_id;
  }
  if (table === 'groups' && 'category_id' in localRecord) {
    localRecord.categoryId = localRecord.category_id; delete localRecord.category_id;
  }
  if (table === 'formulas' && 'category_id' in localRecord) {
    localRecord.categoryId = localRecord.category_id; delete localRecord.category_id;
  }
  if (table === 'savedSearches' && 'filter_config' in localRecord) {
    localRecord.filterConfig = localRecord.filter_config; delete localRecord.filter_config;
  }
  if (table === 'sets') {
    if ('category_scope' in localRecord) { localRecord.categoryScope = localRecord.category_scope; delete localRecord.category_scope; }
    if ('item_ids' in localRecord) { localRecord.itemIds = localRecord.item_ids; delete localRecord.item_ids; }
  }

  if ('created_at' in localRecord) { localRecord.createdAt = localRecord.created_at; delete localRecord.created_at; }
  if ('updated_at' in localRecord) { localRecord.updatedAt = localRecord.updated_at; delete localRecord.updated_at; }

  return localRecord;
}

export async function pushLocalToCloud(userId: string) {
  if (!supabase) return;

  for (const table of ALL_TABLES) {
    const records = await db[table].toArray();
    if (records.length === 0) continue;

    const cloudRecords = records.map(record => mapLocalToCloud(table, record, userId));
    const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
    
    const { error } = await supabase.from(supabaseTable).upsert(cloudRecords, { onConflict: 'id' });
    if (error) {
      console.error(`Failed to push ${table}:`, error);
      throw new Error(`Failed to push ${table}: ${error.message}`);
    }
  }
}

export async function pullCloudToLocal(userId: string) {
  if (!supabase) return;

  for (const table of ALL_TABLES) {
    const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
    const { data, error } = await supabase.from(supabaseTable).select('*').eq('user_id', userId);
    
    if (error) {
      console.error(`Failed to pull ${table}:`, error);
      continue;
    }

    if (data && data.length > 0) {
      const localRecords = data.map(record => mapCloudToLocal(table, record));
      await (db[table] as any).bulkPut(localRecords);
    }
  }
}

export async function syncRecordToCloud(table: string, record: any, userId: string) {
  if (!supabase) return;
  const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
  const cloudRecord = mapLocalToCloud(table, record, userId);
  
  const { error } = await supabase.from(supabaseTable).upsert([cloudRecord], { onConflict: 'id' });
  if (error) console.error(`Failed to push record to ${table}:`, error);
}

export async function deleteRecordFromCloud(table: string, id: string) {
  if (!supabase) return;
  const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
  
  const { error } = await supabase.from(supabaseTable).delete().eq('id', id);
  if (error) console.error(`Failed to delete record from ${table}:`, error);
}
