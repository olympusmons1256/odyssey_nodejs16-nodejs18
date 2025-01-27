import { firestore } from "firebase-admin";

/**
 * Converts an object to a flattened format using dot notation for nested fields
 * This is required for Firestore update operations
 * @param obj The object to flatten
 * @param prefix Optional prefix for nested keys
 * @returns A flattened object with dot notation keys
 */
export function toFirestoreUpdateData<T extends object>(obj: T, prefix = ""): { [key: string]: any } {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value === undefined) {
      return acc;
    }
    
    if (value instanceof firestore.Timestamp || 
        value === null || 
        typeof value !== "object" ||
        Array.isArray(value)) {
      acc[newKey] = value;
      return acc;
    }
    
    Object.assign(acc, toFirestoreUpdateData(value as object, newKey));
    return acc;
  }, {} as { [key: string]: any });
}
