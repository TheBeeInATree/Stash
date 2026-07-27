import Dexie, { type EntityTable } from 'dexie';

export interface FieldTemplate {
  name: string;
  type: 'text' | 'number' | 'currency' | 'weight' | 'volume' | 'count' | 'date' | 'dropdown' | 'boolean';
  required?: boolean;
  options?: string[]; // For dropdowns
}

export interface Category {
  id: string; // UUID
  name: string;
  icon: string;
  fieldTemplate: FieldTemplate[];
  budget?: { amount: number; period: 'monthly' | 'yearly' };
  createdAt: number;
  updatedAt: number;
}

export interface StatusEntry {
  status: 'considering' | 'unopened' | 'in_use' | 'finished' | 'discarded';
  timestamp: number;
}

export interface Location {
  id: string; // UUID
  name: string;
  parentLocationId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogEntry {
  timestamp: number;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface Item {
  id: string; // UUID
  name: string;
  categoryId: string;
  groupId: string | null;
  photo: string | null;
  fields: Record<string, any>;
  tags: string[];
  manualLifespanDays?: number;
  locationId?: string | null;
  productLinkId?: string | null;
  barcode?: string | null;
  lowStockThreshold?: number | null;
  originalQuantity?: number | null;
  priceEditLog?: { oldPrice: number; newPrice: number; timestamp: number }[];
  trackUsage?: boolean;
  usageLog?: { timestamp: number; quantityUsed?: number | null; note?: string | null }[];
  purchaseDate: number | null;
  purchasePrice: number | null;
  status: 'considering' | 'unopened' | 'in_use' | 'finished' | 'discarded';
  statusHistory: StatusEntry[];
  auditLog?: AuditLogEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string; // UUID
  name: string;
  categoryId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Formula {
  id: string; // UUID
  categoryId: string;
  name: string;
  expression: string;
  createdAt: number;
  updatedAt: number;
}

export interface SavedSearch {
  id: string; // UUID
  name: string;
  filterConfig: Record<string, any>;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SetEntity {
  id: string; // UUID
  name: string;
  categoryScope?: string;
  itemIds: { itemId: string; quantityUsed?: number }[];
  createdAt: number;
  updatedAt: number;
}

const db = new Dexie('PersonalInventoryDB') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  items: EntityTable<Item, 'id'>;
  groups: EntityTable<Group, 'id'>;
  formulas: EntityTable<Formula, 'id'>;
  locations: EntityTable<Location, 'id'>;
  savedSearches: EntityTable<SavedSearch, 'id'>;
  sets: EntityTable<SetEntity, 'id'>;
};

db.version(1).stores({
  categories: 'id, name, createdAt, updatedAt',
  items: 'id, name, categoryId, groupId, status, createdAt, updatedAt, *tags',
  groups: 'id, categoryId, createdAt, updatedAt',
  formulas: 'id, categoryId, createdAt, updatedAt'
});

db.version(2).stores({
  items: 'id, name, categoryId, groupId, locationId, status, createdAt, updatedAt, *tags',
  locations: 'id, parentLocationId, createdAt, updatedAt'
});

db.version(3).stores({
  items: 'id, name, categoryId, groupId, locationId, status, createdAt, updatedAt, *tags'
});

db.version(4).stores({
  items: 'id, name, categoryId, groupId, locationId, status, createdAt, updatedAt, *tags',
  savedSearches: 'id, name, pinned, createdAt, updatedAt',
  sets: 'id, name, categoryScope, createdAt, updatedAt'
});

export { db };
