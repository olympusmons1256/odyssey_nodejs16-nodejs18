"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingSubscription = exports.BillingUsage = exports.BillingPublic = void 0;
const swagger_1 = require("@nestjs/swagger");
const firebaseAdmin = __importStar(require("firebase-admin"));
class BillingFeatures {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingFeatures.prototype, "bridge", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingFeatures.prototype, "restApi", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingFeatures.prototype, "sharding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingFeatures.prototype, "analytics", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingFeatures.prototype, "publishSpace", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingFeatures.prototype, "inWorldStreams", void 0);
class AutoTopupCredits {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AutoTopupCredits.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AutoTopupCredits.prototype, "threshold", void 0);
class BillingSubscriptionSubscription {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscriptionSubscription.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscriptionSubscription.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], BillingSubscriptionSubscription.prototype, "currentPeriodStart", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", firebaseAdmin.firestore.Timestamp)
], BillingSubscriptionSubscription.prototype, "currentPeriodEnd", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingSubscriptionSubscription.prototype, "canceled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingSubscriptionSubscription.prototype, "workspaceSeatsSubscribed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingSubscriptionSubscription.prototype, "publishedSpacesSubscribed", void 0);
class BillingSubscriptionPendingSubscription {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscriptionPendingSubscription.prototype, "stripeProductId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscriptionPendingSubscription.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingSubscriptionPendingSubscription.prototype, "workspaceSeatsQuantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], BillingSubscriptionPendingSubscription.prototype, "publishedSpacesQuantity", void 0);
class BillingPublic {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingPublic.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BillingPublic.prototype, "hasAvailableCredits", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BillingPublic.prototype, "hasActiveSubscription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Boolean)
], BillingPublic.prototype, "disableBilling", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], BillingPublic.prototype, "aggregateBillingState", void 0);
exports.BillingPublic = BillingPublic;
class BillingUsage {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingUsage.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingUsage.prototype, "availableCredits", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingUsage.prototype, "workspaceSeatsUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingUsage.prototype, "publishedSpacesUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingUsage.prototype, "workspaceSeatsSubscribed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BillingUsage.prototype, "publishedSpacesSubscribed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", AutoTopupCredits)
], BillingUsage.prototype, "autoTopupCredits", void 0);
exports.BillingUsage = BillingUsage;
class BillingSubscription {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscription.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscription.prototype, "stripeProductId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BillingSubscription.prototype, "stripeCustomerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", BillingSubscriptionSubscription)
], BillingSubscription.prototype, "stripeSubscription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", BillingSubscriptionPendingSubscription)
], BillingSubscription.prototype, "pendingSubscription", void 0);
exports.BillingSubscription = BillingSubscription;
//# sourceMappingURL=billing.entity.js.map