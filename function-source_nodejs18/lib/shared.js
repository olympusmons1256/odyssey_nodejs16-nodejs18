"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customRunWithDefinedMemory = exports.customRunWithWarm = exports.customRunWith = exports.firebaseServiceAccount = void 0;
const firebase_1 = require("./lib/firebase");
exports.firebaseServiceAccount = `firebase-functions-backend@${(0, firebase_1.getFirebaseProjectId)()}.iam.gserviceaccount.com`;
exports.customRunWith = {
    memory: "256MB",
    serviceAccount: exports.firebaseServiceAccount,
    timeoutSeconds: 300,
    vpcConnector: "gke-odyssey",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY",
};
exports.customRunWithWarm = Object.assign({ minInstances: 1 }, exports.customRunWith);
function customRunWithDefinedMemory(memory) {
    return Object.assign(Object.assign({}, exports.customRunWith), { memory });
}
exports.customRunWithDefinedMemory = customRunWithDefinedMemory;
//# sourceMappingURL=shared.js.map