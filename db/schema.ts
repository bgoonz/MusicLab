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
