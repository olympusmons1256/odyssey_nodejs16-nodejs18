"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_TIER = exports.BILLING_PERIOD = exports.UNREAL_PROJECT_VERSION_STATE = exports.SUPPORTED_UNREAL_ENGINE_VERSION = exports.UNREAL_PROJECT_VERSION_TARGET = exports.UNREAL_PLUGIN_VERSION_STATE = exports.SPACE_ROLES = exports.ORGANIZATION_ROLES = exports.ICE_CONNECTION_STATE = void 0;
exports.ICE_CONNECTION_STATE = ["new", "checking", "connected", "completed", "failed", "disconnected", "closed"];
exports.ORGANIZATION_ROLES = ["org_owner", "org_admin", "org_editor", "org_viewer"];
exports.SPACE_ROLES = ["space_owner", "space_editor", "space_viewer", "space_visitor"];
exports.UNREAL_PLUGIN_VERSION_STATE = [
    "uploaded",
    "supported",
    "supported-5.2",
    "disabled",
    "deprecated",
    "unsupported",
    "expiring",
    "expired",
];
exports.UNREAL_PROJECT_VERSION_TARGET = [
    "Development",
    "Shipping",
];
exports.SUPPORTED_UNREAL_ENGINE_VERSION = [
    "5.0.3",
    "5.2.1",
];
// TODO: add new state for invalid settings file
exports.UNREAL_PROJECT_VERSION_STATE = [
    "new",
    "odyssey-plugin-version-invalid",
    "failed-missing-unreal-plugin-version",
    "failed-missing-unreal-project",
    "failed-missing-package-archive-url",
    "failed-missing-package-archive-checksum",
    "upload-complete",
    "upload-invalid",
    "upload-failed",
    "upload-validating",
    "builder-pod-creating",
    "builder-pod-failed-to-create",
    "builder-pod-timed-out-creating",
    "builder-pod-waiting-for-ready",
    "builder-pod-failed",
    "builder-pod-ready",
    "builder-downloading-project-version",
    "builder-downloading-project-version-failed",
    "builder-finding-project-file-failed",
    "builder-copying-plugin-version",
    "builder-copying-plugin-version-failed",
    "builder-downloading-plugin-version",
    "builder-downloading-plugin-version-failed",
    "builder-validating",
    "builder-validation-failed",
    "builder-update-unreal-project-name",
    "builder-settings-uploaded",
    "builder-building",
    "builder-failed",
    "builder-retrying",
    "builder-uploading",
    "builder-upload-failed",
    "builder-upload-complete",
    "package-validator-required",
    "package-validator-pod-creating",
    "package-validator-pod-failed-to-create",
    "package-validator-pod-waiting-for-ready",
    "package-validator-pod-timed-out",
    "package-validator-pod-ready",
    "package-validator-failed",
    "package-validator-retrying",
    "package-validator-validating",
    "package-validator-updating-unreal-project-name",
    "package-validator-updating-project-path",
    "package-validator-complete",
    "volume-copy-pvcs-creating",
    "volume-copy-pvcs-bound",
    "volume-copy-pvcs-failed",
    "volume-copy-pods-creating",
    "volume-copy-pods-failed-to-create",
    "volume-copy-pods-timed-out-creating",
    "volume-copy-pods-waiting-for-ready",
    "volume-copy-pods-failed",
    "volume-copy-pods-ready",
    "volume-copy-region-copying",
    "volume-copy-region-failed",
    "volume-copy-region-complete",
    "volume-copy-failed",
    "volume-copy-retrying",
    "volume-copy-complete",
    "volume-copy-expiring",
    "volume-copy-expired",
    "expiring",
    "expired",
];
exports.BILLING_PERIOD = ["monthly", "yearly"];
exports.BILLING_TIER = ["sandbox", "pro", "business"];
//# sourceMappingURL=docTypes.js.map