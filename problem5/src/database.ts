import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CreateTaskInput, Task, TaskFilters, TaskRow, UpdateTaskInput } from "./types.js";

const DATABASE_FILE = resolve(process.env.DATABASE_FILE ?? "./data/app.sqlite");

mkdirSync(dirname(DATABASE_FILE), { recursive: true });

export const db = new Database(DATABASE_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
`);

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildWhereClause(filters: TaskFilters): { clause: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }

  if (filters.priority) {
    clauses.push("priority = ?");
    params.push(filters.priority);
  }

  if (filters.search) {
    clauses.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)");
    const search = `%${filters.search.toLowerCase()}%`;
    params.push(search, search);
  }

  if (filters.tag) {
    clauses.push("EXISTS (SELECT 1 FROM json_each(tasks.tags) WHERE LOWER(json_each.value) = ?)");
    params.push(filters.tag);
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export function createTask(input: CreateTaskInput): Task {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title,
    input.description ?? "",
    input.status ?? "todo",
    input.priority ?? 3,
    JSON.stringify(input.tags ?? []),
    now,
    now,
  );

  return getTaskById(id) as Task;
}

export function listTasks(filters: TaskFilters): { data: Task[]; total: number } {
  const where = buildWhereClause(filters);

  const rows = db
    .prepare(`
      SELECT * FROM tasks
      ${where.clause}
      ORDER BY created_at DESC
      LIMIT ?
      OFFSET ?
    `)
    .all(...where.params, filters.limit, filters.offset) as TaskRow[];

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM tasks ${where.clause}`)
    .get(...where.params) as { count: number };

  return {
    data: rows.map(toTask),
    total: total.count,
  };
}

export function getTaskById(id: string): Task | null {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
  return row ? toTask(row) : null;
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const existing = getTaskById(id);
  if (!existing) return null;

  const updated = {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    tags: input.tags ?? existing.tags,
    updatedAt: new Date().toISOString(),
  };

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, priority = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.title,
    updated.description,
    updated.status,
    updated.priority,
    JSON.stringify(updated.tags),
    updated.updatedAt,
    id,
  );

  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return result.changes > 0;
}
