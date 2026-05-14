import{
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  vector,
  index,
} from "drizzle-orm/pg-core"

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // HNSW index cho cosine similarity search
  index("embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // userId sẽ thêm khi tích hợp NextAuth (Phase 8)
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => chatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  sources: jsonb("sources").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});