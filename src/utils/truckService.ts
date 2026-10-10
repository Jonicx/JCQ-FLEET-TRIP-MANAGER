import { TruckServiceRecord } from '../types/database.ts';

export const TRUCK_SERVICE_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const canEditTruckServiceRecord = (record: TruckServiceRecord, now = Date.now()): boolean => {
  const createdAt = new Date(record.created_at).getTime();
  const age = now - createdAt;
  return Number.isFinite(createdAt) && age >= 0 && age <= TRUCK_SERVICE_EDIT_WINDOW_MS;
};
