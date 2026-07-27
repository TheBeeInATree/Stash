import { db } from '../db';
import { supabase } from './supabase';

export const ALL_TABLES = ['categories', 'locations', 'groups', 'formulas', 'items', 'savedSearches', 'sets'] as const;

export function mapLocalToCloud(table: string, record: any, userId: string) {
  const dbRecord = { ...record, user_id: userId };
  
  if (table === 'categories' && dbRecord.fieldTemplate) {
    dbRecord.field_template = dbRecord.fieldTemplate; delete dbRecord.fieldTemplate;
  }
  if (table === 'items') {
    if (dbRecord.categoryId) { dbRecord.category_id = dbRecord.categoryId; delete dbRecord.categoryId; }
    if (dbRecord.groupId) { dbRecord.group_id = dbRecord.groupId; delete dbRecord.groupId; }
    if (dbRecord.locationId) { dbRecord.location_id = dbRecord.locationId; delete dbRecord.locationId; }
    if (dbRecord.productLinkId) { dbRecord.product_link_id = dbRecord.productLinkId; delete dbRecord.productLinkId; }
    if (dbRecord.lowStockThreshold) { dbRecord.low_stock_threshold = dbRecord.lowStockThreshold; delete dbRecord.lowStockThreshold; }
    if (dbRecord.originalQuantity) { dbRecord.original_quantity = dbRecord.originalQuantity; delete dbRecord.originalQuantity; }
    if (dbRecord.priceEditLog) { dbRecord.price_edit_log = dbRecord.priceEditLog; delete dbRecord.priceEditLog; }
    if (dbRecord.trackUsage !== undefined) { dbRecord.track_usage = dbRecord.trackUsage; delete dbRecord.trackUsage; }
    if (dbRecord.usageLog) { dbRecord.usage_log = dbRecord.usageLog; delete dbRecord.usageLog; }
    if (dbRecord.purchaseDate) { dbRecord.purchase_date = dbRecord.purchaseDate; delete dbRecord.purchaseDate; }
    if (dbRecord.purchasePrice) { dbRecord.purchase_price = dbRecord.purchasePrice; delete dbRecord.purchasePrice; }
    if (dbRecord.statusHistory) { dbRecord.status_history = dbRecord.statusHistory; delete dbRecord.statusHistory; }
    if (dbRecord.auditLog) { dbRecord.audit_log = dbRecord.auditLog; delete dbRecord.auditLog; }
    if (dbRecord.manualLifespanDays) { dbRecord.manual_lifespan_days = dbRecord.manualLifespanDays; delete dbRecord.manualLifespanDays; }
  }
  if (table === 'locations' && dbRecord.parentLocationId) {
    dbRecord.parent_location_id = dbRecord.parentLocationId; delete dbRecord.parentLocationId;
  }
  if (table === 'groups' && dbRecord.categoryId) {
    dbRecord.category_id = dbRecord.categoryId; delete dbRecord.categoryId;
  }
  if (table === 'formulas' && dbRecord.categoryId) {
    dbRecord.category_id = dbRecord.categoryId; delete dbRecord.categoryId;
  }
  if (table === 'savedSearches' && dbRecord.filterConfig) {
    dbRecord.filter_config = dbRecord.filterConfig; delete dbRecord.filterConfig;
  }
  if (table === 'sets') {
    if (dbRecord.categoryScope) { dbRecord.category_scope = dbRecord.categoryScope; delete dbRecord.categoryScope; }
    if (dbRecord.itemIds) { dbRecord.item_ids = dbRecord.itemIds; delete dbRecord.itemIds; }
  }

  if (dbRecord.createdAt) { dbRecord.created_at = dbRecord.createdAt; delete dbRecord.createdAt; }
  if (dbRecord.updatedAt) { dbRecord.updated_at = dbRecord.updatedAt; delete dbRecord.updatedAt; }

  return dbRecord;
}

export function mapCloudToLocal(table: string, record: any) {
  const localRecord = { ...record };
  delete localRecord.user_id;

  if (table === 'categories' && localRecord.field_template) {
    localRecord.fieldTemplate = localRecord.field_template; delete localRecord.field_template;
  }
  if (table === 'items') {
    if (localRecord.category_id) { localRecord.categoryId = localRecord.category_id; delete localRecord.category_id; }
    if (localRecord.group_id) { localRecord.groupId = localRecord.group_id; delete localRecord.group_id; }
    if (localRecord.location_id) { localRecord.locationId = localRecord.location_id; delete localRecord.location_id; }
    if (localRecord.product_link_id) { localRecord.productLinkId = localRecord.product_link_id; delete localRecord.product_link_id; }
    if (localRecord.low_stock_threshold) { localRecord.lowStockThreshold = localRecord.low_stock_threshold; delete localRecord.low_stock_threshold; }
    if (localRecord.original_quantity) { localRecord.originalQuantity = localRecord.original_quantity; delete localRecord.original_quantity; }
    if (localRecord.price_edit_log) { localRecord.priceEditLog = localRecord.price_edit_log; delete localRecord.price_edit_log; }
    if (localRecord.track_usage !== undefined) { localRecord.trackUsage = localRecord.track_usage; delete localRecord.track_usage; }
    if (localRecord.usage_log) { localRecord.usageLog = localRecord.usage_log; delete localRecord.usage_log; }
    if (localRecord.purchase_date) { localRecord.purchaseDate = localRecord.purchase_date; delete localRecord.purchase_date; }
    if (localRecord.purchase_price) { localRecord.purchasePrice = localRecord.purchase_price; delete localRecord.purchase_price; }
    if (localRecord.status_history) { localRecord.statusHistory = localRecord.status_history; delete localRecord.status_history; }
    if (localRecord.audit_log) { localRecord.auditLog = localRecord.audit_log; delete localRecord.audit_log; }
    if (localRecord.manual_lifespan_days) { localRecord.manualLifespanDays = localRecord.manual_lifespan_days; delete localRecord.manual_lifespan_days; }
  }
  if (table === 'locations' && localRecord.parent_location_id) {
    localRecord.parentLocationId = localRecord.parent_location_id; delete localRecord.parent_location_id;
  }
  if (table === 'groups' && localRecord.category_id) {
    localRecord.categoryId = localRecord.category_id; delete localRecord.category_id;
  }
  if (table === 'formulas' && localRecord.category_id) {
    localRecord.categoryId = localRecord.category_id; delete localRecord.category_id;
  }
  if (table === 'savedSearches' && localRecord.filter_config) {
    localRecord.filterConfig = localRecord.filter_config; delete localRecord.filter_config;
  }
  if (table === 'sets') {
    if (localRecord.category_scope) { localRecord.categoryScope = localRecord.category_scope; delete localRecord.category_scope; }
    if (localRecord.item_ids) { localRecord.itemIds = localRecord.item_ids; delete localRecord.item_ids; }
  }

  if (localRecord.created_at) { localRecord.createdAt = localRecord.created_at; delete localRecord.created_at; }
  if (localRecord.updated_at) { localRecord.updatedAt = localRecord.updated_at; delete localRecord.updated_at; }

  return localRecord;
}

export async function pushLocalToCloud(userId: string) {
  if (!supabase) return;

  for (const table of ALL_TABLES) {
    const records = await db[table].toArray();
    if (records.length === 0) continue;

    const cloudRecords = records.map(record => mapLocalToCloud(table, record, userId));
    const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
    
    const { error } = await supabase.from(supabaseTable).upsert(cloudRecords);
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
  
  const { error } = await supabase.from(supabaseTable).upsert([cloudRecord]);
  if (error) console.error(`Failed to push record to ${table}:`, error);
}

export async function deleteRecordFromCloud(table: string, id: string) {
  if (!supabase) return;
  const supabaseTable = table === 'savedSearches' ? 'saved_searches' : table;
  
  const { error } = await supabase.from(supabaseTable).delete().eq('id', id);
  if (error) console.error(`Failed to delete record from ${table}:`, error);
}
