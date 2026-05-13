import { TASK_STATUSES, type CreateTaskInput, type TaskFilters, type TaskStatus, type UpdateTaskInput } from "./types.js";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TAG_LENGTH = 32;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class BadRequestError extends Error {
  statusCode = 400;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new BadRequestError(`${field} must be a string.`);
  }

  return value.trim();
}

function assertStatus(value: unknown): TaskStatus {
  if (typeof value !== "string" || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new BadRequestError(`status must be one of: ${TASK_STATUSES.join(", ")}.`);
  }

  return value as TaskStatus;
}

function assertPriority(value: unknown): number {
  const priority = Number(value);

  if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
    throw new BadRequestError("priority must be an integer between 1 and 5.");
  }

  return priority;
}

function normalizeTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BadRequestError("tags must be an array of strings.");

  const tags = value.map((tag) => {
    const normalized = assertString(tag, "tag");
    if (!normalized) throw new BadRequestError("tags cannot contain empty values.");
    if (normalized.length > MAX_TAG_LENGTH) {
      throw new BadRequestError(`tags cannot be longer than ${MAX_TAG_LENGTH} characters.`);
    }

    return normalized.toLowerCase();
  });

  return [...new Set(tags)];
}

export function parseCreateTask(body: unknown): CreateTaskInput {
  if (!isPlainObject(body)) throw new BadRequestError("Request body must be a JSON object.");

  const title = assertString(body.title, "title");
  if (!title) throw new BadRequestError("title is required.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new BadRequestError(`title cannot be longer than ${MAX_TITLE_LENGTH} characters.`);
  }

  const description = body.description === undefined ? "" : assertString(body.description, "description");
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new BadRequestError(`description cannot be longer than ${MAX_DESCRIPTION_LENGTH} characters.`);
  }

  return {
    title,
    description,
    status: body.status === undefined ? "todo" : assertStatus(body.status),
    priority: body.priority === undefined ? 3 : assertPriority(body.priority),
    tags: normalizeTags(body.tags),
  };
}

export function parseUpdateTask(body: unknown): UpdateTaskInput {
  if (!isPlainObject(body)) throw new BadRequestError("Request body must be a JSON object.");

  const input: UpdateTaskInput = {};

  if (body.title !== undefined) {
    input.title = assertString(body.title, "title");
    if (!input.title) throw new BadRequestError("title cannot be empty.");
    if (input.title.length > MAX_TITLE_LENGTH) {
      throw new BadRequestError(`title cannot be longer than ${MAX_TITLE_LENGTH} characters.`);
    }
  }

  if (body.description !== undefined) {
    input.description = assertString(body.description, "description");
    if (input.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new BadRequestError(`description cannot be longer than ${MAX_DESCRIPTION_LENGTH} characters.`);
    }
  }

  if (body.status !== undefined) input.status = assertStatus(body.status);
  if (body.priority !== undefined) input.priority = assertPriority(body.priority);
  if (body.tags !== undefined) input.tags = normalizeTags(body.tags);

  if (Object.keys(input).length === 0) {
    throw new BadRequestError("At least one field is required to update a task.");
  }

  return input;
}

export function parseTaskFilters(query: Record<string, unknown>): TaskFilters {
  const status = query.status === undefined ? undefined : assertStatus(query.status);
  const priority = query.priority === undefined ? undefined : assertPriority(query.priority);
  const search = typeof query.search === "string" && query.search.trim() ? query.search.trim() : undefined;
  const tag = typeof query.tag === "string" && query.tag.trim() ? query.tag.trim().toLowerCase() : undefined;
  const limit = query.limit === undefined ? DEFAULT_LIMIT : Math.min(assertPriorityLikeLimit(query.limit), MAX_LIMIT);
  const offset = query.offset === undefined ? 0 : assertOffset(query.offset);

  return { status, priority, search, tag, limit, offset };
}

function assertPriorityLikeLimit(value: unknown): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new BadRequestError("limit must be a positive integer.");
  }

  return limit;
}

function assertOffset(value: unknown): number {
  const offset = Number(value);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new BadRequestError("offset must be zero or a positive integer.");
  }

  return offset;
}
