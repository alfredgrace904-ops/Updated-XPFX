import { pgTable, text, numeric, integer, timestamp, uuid, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const p2pListingStatusEnum = pgEnum("p2p_listing_status", ["active", "inactive", "completed"]);
export const p2pOrderStatusEnum = pgEnum("p2p_order_status", [
  "pending", "payment_sent", "completed", "disputed", "cancelled"
]);
export const p2pListingTypeEnum = pgEnum("p2p_listing_type", ["buy", "sell"]);
export const p2pNotificationTypeEnum = pgEnum("p2p_notification_type", [
  "deposit_incoming", "deposit_confirmed", "p2p_deposit", "order_update", "admin_message"
]);
export const p2pMerchantApplicationStatusEnum = pgEnum("p2p_merchant_application_status", [
  "pending", "approved", "rejected"
]);
export const p2pMerchantPaymentMethodEnum = pgEnum("p2p_merchant_payment_method", [
  "etransfer", "bank"
]);

export const p2pListingsTable = pgTable("p2p_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatarUrl: text("user_avatar_url"),
  type: p2pListingTypeEnum("type").notNull(),
  asset: text("asset").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  minOrder: numeric("min_order", { precision: 20, scale: 8 }).notNull(),
  maxOrder: numeric("max_order", { precision: 20, scale: 8 }).notNull(),
  paymentMethods: text("payment_methods").array().notNull().default([]),
  completionRate: numeric("completion_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
  status: p2pListingStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const p2pOrdersTable = pgTable("p2p_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull(),
  buyerId: uuid("buyer_id").notNull(),
  sellerId: uuid("seller_id").notNull(),
  asset: text("asset").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: p2pOrderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const p2pNotificationsTable = pgTable("p2p_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: p2pNotificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  orderId: text("order_id"),
  read: boolean("read").notNull().default(false),
  amount: numeric("amount", { precision: 20, scale: 8 }),
  currency: text("currency"),
  asset: text("asset"),
  reference: text("reference"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const p2pMerchantApplicationsTable = pgTable("p2p_merchant_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  status: p2pMerchantApplicationStatusEnum("status").notNull().default("pending"),
  displayName: text("display_name").notNull(),
  legalName: text("legal_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  country: text("country").notNull(),
  paymentMethod: p2pMerchantPaymentMethodEnum("payment_method").notNull(),
  payoutEmail: text("payout_email"),
  bankInfo: text("bank_info"),
  assets: text("assets").notNull(),
  reason: text("reason").notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const insertP2PListingSchema = createInsertSchema(p2pListingsTable).omit({ id: true, createdAt: true });
export const insertP2POrderSchema = createInsertSchema(p2pOrdersTable).omit({ id: true, createdAt: true });
export const insertP2PMerchantApplicationSchema = createInsertSchema(p2pMerchantApplicationsTable).omit({
  id: true, submittedAt: true, reviewedAt: true, reviewedBy: true, status: true, rejectionReason: true,
});
export type InsertP2PListing = z.infer<typeof insertP2PListingSchema>;
export type InsertP2POrder = z.infer<typeof insertP2POrderSchema>;
export type InsertP2PMerchantApplication = z.infer<typeof insertP2PMerchantApplicationSchema>;
export type P2PListing = typeof p2pListingsTable.$inferSelect;
export type P2POrder = typeof p2pOrdersTable.$inferSelect;
export type P2PNotification = typeof p2pNotificationsTable.$inferSelect;
export type P2PMerchantApplication = typeof p2pMerchantApplicationsTable.$inferSelect;
