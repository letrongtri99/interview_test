import "dotenv/config";
import cors from "cors";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import helmet from "helmet";
import { createTask, deleteTask, getTaskById, listTasks, updateTask } from "./database.js";
import { BadRequestError, parseCreateTask, parseTaskFilters, parseUpdateTask } from "./validation.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "64kb" }));

const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

function getIdParam(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError("id path parameter is required.");
  }

  return value;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/tasks",
  asyncHandler((req, res) => {
    const input = parseCreateTask(req.body);
    const task = createTask(input);

    res.status(201).json({ data: task });
  }),
);

app.get(
  "/tasks",
  asyncHandler((req, res) => {
    const filters = parseTaskFilters(req.query);
    const result = listTasks(filters);

    res.json({
      data: result.data,
      meta: {
        filters,
        limit: filters.limit,
        offset: filters.offset,
        count: result.data.length,
        total: result.total,
      },
    });
  }),
);

app.get(
  "/tasks/:id",
  asyncHandler((req, res) => {
    const task = getTaskById(getIdParam(req.params.id));
    if (!task) {
      res.status(404).json({ error: { message: "Task not found." } });
      return;
    }

    res.json({ data: task });
  }),
);

app.patch(
  "/tasks/:id",
  asyncHandler((req, res) => {
    const id = getIdParam(req.params.id);
    const input = parseUpdateTask(req.body);
    const task = updateTask(id, input);
    if (!task) {
      res.status(404).json({ error: { message: "Task not found." } });
      return;
    }

    res.json({ data: task });
  }),
);

app.delete(
  "/tasks/:id",
  asyncHandler((req, res) => {
    const deleted = deleteTask(getIdParam(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: { message: "Task not found." } });
      return;
    }

    res.status(204).send();
  }),
);

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Route not found." } });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: { message: "Request body must be valid JSON." } });
    return;
  }

  if (error instanceof BadRequestError) {
    res.status(error.statusCode).json({ error: { message: error.message } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { message: "Internal server error." } });
};

app.use(errorHandler);

const server = app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error("Failed to start API server.", error);
  process.exit(1);
});
