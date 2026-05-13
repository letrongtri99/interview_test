# Problem 5: ExpressJS CRUD Backend

This is a small ExpressJS + TypeScript backend that exposes a CRUD API for `tasks`.

It uses SQLite for persistence. By default, data is stored in `./data/app.sqlite`.

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
cp .env.example .env
```

The default configuration is:

```env
PORT=3000
HOST=127.0.0.1
DATABASE_FILE=./data/app.sqlite
```

## Run

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Type-check only:

```bash
npm run check
```

## API

Base URL:

```text
http://localhost:3000
```

### Health check

```bash
curl http://localhost:3000/health
```

### Create a task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build CRUD API",
    "description": "Implement ExpressJS endpoints with SQLite persistence",
    "status": "todo",
    "priority": 4,
    "tags": ["backend", "typescript"]
  }'
```

### List tasks

```bash
curl "http://localhost:3000/tasks"
```

Supported filters:

- `status`: `todo`, `in_progress`, or `done`
- `priority`: integer from `1` to `5`
- `search`: matches task title or description
- `tag`: matches one tag
- `limit`: page size, default `20`, max `100`
- `offset`: pagination offset, default `0`

Example:

```bash
curl "http://localhost:3000/tasks?status=todo&priority=4&tag=backend&limit=10&offset=0"
```

### Get task details

```bash
curl http://localhost:3000/tasks/<task_id>
```

### Update a task

```bash
curl -X PATCH http://localhost:3000/tasks/<task_id> \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": 5
  }'
```

### Delete a task

```bash
curl -X DELETE http://localhost:3000/tasks/<task_id>
```

Successful deletes return `204 No Content`.

## Data model

```ts
interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Notes

- Invalid input returns `400`.
- Missing tasks return `404`.
- Unknown server errors return `500`.
- SQLite tables and indexes are created automatically at startup.
