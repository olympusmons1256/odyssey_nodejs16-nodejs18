"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFirestoreUpdateData = void 0;
const firebase_admin_1 = require("firebase-admin");
/**
 * Converts an object to a flattened format using dot notation for nested fields
 * This is required for Firestore update operations
 * @param obj The object to flatten
 * @param prefix Optional prefix for nested keys
 * @returns A flattened object with dot notation keys
 */
function toFirestoreUpdateData(obj, prefix = "") {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value === undefined) {
            return acc;
        }
        if (value instanceof firebase_admin_1.firestore.Timestamp ||
            value === null ||
            typeof value !== "object" ||
            Array.isArray(value)) {
            acc[newKey] = value;
            return acc;
        }
        Object.assign(acc, toFirestoreUpdateData(value, newKey));
        return acc;
    }, {});
}
exports.toFirestoreUpdateData = toFirestoreUpdateData;
//# sourceMappingURL=utils.js.map