import { pgTable, text, numeric, timestamp, uuid, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeTypeEnum = pgEnum("trade_type", ["long", "short"]);
export const tradeStatusEnum = pgEnum("trade_status", ["active", "completed", "cancelled"]);

export const tradesTable = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  pair: text("pair").notNull(),
  type: tradeTypeEnum("type").notNull(),
  status: tradeStatusEnum("status").notNull().default("active"),
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }).notNull(),
  currentPrice: numeric("current_price", { precision: 20, scale: 8 }).notNull(),
  targetPrice: numeric("target_price", { precision: 20, scale: 8 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USDT"),
  profit: numeric("profit", { precision: 20, scale: 8 }).notNull().default("0"),
  expectedProfit: numeric("expected_profit", { precision: 20, scale: 8 }).notNull().default("0"),
  managerId: text("manager_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
