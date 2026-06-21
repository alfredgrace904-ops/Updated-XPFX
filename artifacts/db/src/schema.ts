import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * USERS TABLE
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * TRANSACTIONS TABLE (FINTECH CORE)
 */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: text("amount").notNull(),
  type: text("type").notNull(), // deposit | withdrawal | transfer
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});