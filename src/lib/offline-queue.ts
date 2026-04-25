import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'akf_pos_offline';
const STORE_NAME = 'order_queue';
const DB_VERSION = 1;

export interface QueuedOrder {
  id: string; // uuid v4
  timestamp: number;
  payload: any;
  retryCount: number;
  error?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Add an order to the offline queue.
 */
export const queueOrder = async (order: any) => {
  const db = await getDB();
  const queuedOrder: QueuedOrder = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    payload: order,
    retryCount: 0,
  };
  await db.add(STORE_NAME, queuedOrder);
  console.log(`[Offline] 📥 Order queued: ${queuedOrder.id}`);
  return queuedOrder.id;
};

/**
 * Get all queued orders.
 */
export const getQueuedOrders = async (): Promise<QueuedOrder[]> => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

/**
 * Remove an order from the queue.
 */
export const removeQueuedOrder = async (id: string) => {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  console.log(`[Offline] 📤 Order removed from queue: ${id}`);
};

/**
 * Update a queued order (e.g., increment retry count).
 */
export const updateQueuedOrder = async (order: QueuedOrder) => {
  const db = await getDB();
  await db.put(STORE_NAME, order);
};
