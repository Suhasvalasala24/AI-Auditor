import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Custom Model schema
export const customModels = pgTable("custom_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nickname: text("nickname").notNull(),
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key"),
  provider: text("provider"),
  description: text("description"),
  temperature: text("temperature"),
  maxTokens: text("max_tokens"),
  topP: text("top_p"),
  seed: text("seed"),
});

export const insertCustomModelSchema = createInsertSchema(customModels).omit({
  id: true,
});

export type InsertCustomModel = z.infer<typeof insertCustomModelSchema>;
export type CustomModel = typeof customModels.$inferSelect;

// Audit schema
export const audits = pgTable("audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'model' | 'log'
  modelId: varchar("model_id"),
  status: text("status").notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  categories: text("categories").array(),
  testPrompts: text("test_prompts"),
  iterations: integer("iterations"),
  results: text("results"), // JSON string of results
  createdAt: text("created_at"),
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
});

export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type Audit = typeof audits.$inferSelect;

// Dashboard metrics type (not stored in DB, computed)
export interface DashboardMetrics {
  totalModelsMonitored: number;
  modelsUnderMonitoring: number;
  overallAIRiskScore: number;
  complianceReadinessScore: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface TrendData {
  oneMonth: ChartDataPoint[];
  sixMonths: ChartDataPoint[];
  oneYear: ChartDataPoint[];
}

// System models type (static data)
export interface SystemModel {
  id: string;
  name: string;
  icon: string;
}
