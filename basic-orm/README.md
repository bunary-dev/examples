# Basic ORM Example

A complete example demonstrating how to use `@bunary/orm` in a Bunary application.

## Features Demonstrated

- ✅ **ORM Configuration** - Setting up SQLite database connection
- ✅ **Database Setup** - Creating tables and inserting sample data
- ✅ **Basic Queries** - `find()`, `all()`, `select()`, `exclude()`
- ✅ **Advanced Queries** - `where()`, `limit()`, `offset()`, `orderBy()`, `first()`, `count()`
- ✅ **Method Chaining** - Combining multiple query builder methods
- ✅ **Complex Queries** - Real-world query patterns

## Quick Start

```bash
# Install dependencies
bun install

# Run the example
bun run dev
```

## What This Example Shows

### 1. Configuration

```typescript
import { setOrmConfig } from "@bunary/orm";

setOrmConfig({
  database: {
    type: "sqlite",
    sqlite: {
      path: "./example.sqlite"
    }
  }
});
```

### 2. Basic Queries

```typescript
// Find a record by ID
const user = await Model.table("users").find(1);

// Get all records
const users = await Model.table("users").all();

// Select specific columns
const users = await Model.table("users")
  .select("id", "name", "email")
  .all();

// Exclude sensitive columns
const users = await Model.table("users")
  .exclude("password")
  .all();
```

### 3. Advanced Queries

```typescript
// Where clauses
const activeUsers = await Model.table("users")
  .where("active", 1)
  .all();

const youngUsers = await Model.table("users")
  .where("age", "<", 30)
  .all();

// Pagination
const page2 = await Model.table("users")
  .orderBy("id", "asc")
  .offset(2)
  .limit(2)
  .all();

// Count
const total = await Model.table("users").count();
```

### 4. Complex Chaining

```typescript
const results = await Model.table("users")
  .select("id", "name", "email", "age")
  .where("active", 1)
  .where("age", ">", 25)
  .orderBy("age", "desc")
  .limit(3)
  .all();
```

## Example Output

When you run this example, you'll see:

```
🚀 Bunary Basic ORM Example

✅ Database initialized with sample data

📊 Demonstrating ORM Queries

1️⃣  Find a user by ID
   Result: { id: 1, name: 'John Doe', email: 'john@example.com', ... }

2️⃣  Get all users
   Found 5 users

3️⃣  Select specific columns
   Users (id, name, email only): [...]

... and more examples
```

## Database Schema

The example creates two tables:

### `users` table
- `id` - INTEGER PRIMARY KEY
- `name` - TEXT NOT NULL
- `email` - TEXT NOT NULL UNIQUE
- `password` - TEXT NOT NULL
- `age` - INTEGER
- `active` - INTEGER DEFAULT 1
- `created_at` - TEXT DEFAULT CURRENT_TIMESTAMP

### `posts` table
- `id` - INTEGER PRIMARY KEY
- `user_id` - INTEGER NOT NULL (foreign key to users)
- `title` - TEXT NOT NULL
- `content` - TEXT
- `published` - INTEGER DEFAULT 0
- `created_at` - TEXT DEFAULT CURRENT_TIMESTAMP

## Project Structure

```
basic-orm/
├── package.json          # Dependencies and scripts
├── README.md            # This file
├── src/
│   └── index.ts         # Main example code
└── .gitignore          # Git ignore rules
```

## Available Scripts

- `bun run dev` - Run the example with hot reload
- `bun run build` - Build the example
- `bun run start` - Run the built example

## Next Steps

1. **Modify the queries** - Experiment with different query patterns
2. **Add your own tables** - Create tables for your use case
3. **Explore the API** - Check the [@bunary/orm documentation](../../orm/README.md)
4. **Build an app** - Use this as a starting point for your application

## Related Documentation

- [@bunary/orm Package](../../orm/README.md) - Full ORM documentation
- [@bunary/core Package](../../core/README.md) - Core utilities
- [Basic API Example](../basic-api) - HTTP routing example

## Requirements

- Bun ≥ 1.0.0
- @bunary/orm ≥ 0.0.1
