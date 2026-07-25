import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const practiceTools = sqliteTable("practice_tools", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  sourcePath: text("source_path").notNull(),
  repositoryCommit: text("repository_commit"),
  authorId: text("author_id"),
  status: text("status", { enum: ["draft", "review", "published", "rejected"] }).notNull().default("draft"),
  useCount: integer("use_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }),
});

export const lessonUploads = sqliteTable("lesson_uploads", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const creditAccounts = sqliteTable("credit_accounts", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  balanceMicroUsd: integer("balance_micro_usd").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const creditLedger = sqliteTable("credit_ledger", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind", { enum: ["purchase", "reservation", "usage", "refund", "adjustment"] }).notNull(),
  amountMicroUsd: integer("amount_micro_usd").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull().unique(),
  metadataJson: text("metadata_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const checkoutOrders = sqliteTable("checkout_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  packageId: text("package_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  creditsMicroUsd: integer("credits_micro_usd").notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  status: text("status", { enum: ["pending", "paid", "expired", "refunded"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }),
});

export const paymentEvents = sqliteTable("payment_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }).notNull(),
});

export const aiUsage = sqliteTable("ai_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  requestId: text("request_id").notNull().unique(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  reservedMicroUsd: integer("reserved_micro_usd").notNull(),
  actualMicroUsd: integer("actual_micro_usd"),
  status: text("status", { enum: ["reserved", "settled", "released", "failed"] }).notNull().default("reserved"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  settledAt: integer("settled_at", { mode: "timestamp" }),
});

export const githubPublications = sqliteTable("github_publications", {
  id: text("id").primaryKey(),
  toolId: text("tool_id").notNull(),
  userId: text("user_id").notNull(),
  branch: text("branch").notNull(),
  pullRequestUrl: text("pull_request_url"),
  status: text("status", { enum: ["creating", "review", "merged", "failed"] }).notNull().default("creating"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
