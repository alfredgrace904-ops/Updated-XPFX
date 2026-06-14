import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Immutable audit trail for every sensitive action taken by users or admins.
 * Rows must never be deleted — only appended.
 */
export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** The user who triggered the action (may be an admin acting on behalf of a user). */
  userId: uuid("user_id"),
  /** The admin who performed the action, if different from userId. */
  adminId: uuid("admin_id"),
  /** Short machine-readable action key, e.g. "deposit.approve", "user.login". */
  action: text("action").notNull(),
  /** Human-readable detail string. */
  detail: text("detail").notNull().default(""),
  /** Optional structured payload (request body snapshot, before/after values, etc.). */
  payload: jsonb("payload"),
  /** IP address of the actor at the time of the action. */
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
