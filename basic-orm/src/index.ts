/**
 * Basic ORM Example
 *
 * This example demonstrates how to use @bunary/orm in a Bunary application:
 * - Setting up ORM configuration
 * - Creating database tables
 * - Using Model classes (Eloquent-like pattern)
 * - Basic query operations (find, all, select, exclude)
 * - Advanced query operations (where, limit, offset, orderBy, first, count)
 * - Method chaining
 */

import { setOrmConfig } from "@bunary/orm";
import { Database } from "bun:sqlite";
import { Users, Posts } from "./models/index.js";

// ============================================================================
// ORM Configuration
// ============================================================================

const dbPath = "./example.sqlite";

// Configure the ORM with SQLite
setOrmConfig({
	database: {
		type: "sqlite",
		sqlite: {
			path: dbPath,
		},
	},
});

// ============================================================================
// Database Setup
// ============================================================================

/**
 * Initialize the database with sample tables and data
 */
function initializeDatabase() {
	const db = new Database(dbPath);

	// Create users table
	db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			age INTEGER,
			active INTEGER DEFAULT 1,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		);
	`);

	// Create posts table
	db.exec(`
		CREATE TABLE IF NOT EXISTS posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			content TEXT,
			published INTEGER DEFAULT 0,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`);

	// Clear existing data
	db.exec("DELETE FROM posts");
	db.exec("DELETE FROM users");

	// Insert sample users
	db.exec(`
		INSERT INTO users (name, email, password, age, active) VALUES
			('John Doe', 'john@example.com', 'secret123', 25, 1),
			('Jane Smith', 'jane@example.com', 'secret456', 30, 1),
			('Bob Wilson', 'bob@example.com', 'secret789', 28, 0),
			('Alice Brown', 'alice@example.com', 'secret012', 35, 1),
			('Charlie Davis', 'charlie@example.com', 'secret345', 22, 1);
	`);

	// Insert sample posts
	db.exec(`
		INSERT INTO posts (user_id, title, content, published) VALUES
			(1, 'First Post', 'This is my first post!', 1),
			(1, 'Second Post', 'Another post by John', 1),
			(2, 'Hello World', 'Jane says hello', 1),
			(2, 'Draft Post', 'This is a draft', 0),
			(4, 'Alice Post', 'Content from Alice', 1);
	`);

	db.close();
	console.log("✅ Database initialized with sample data");
}

// ============================================================================
// Example Queries
// ============================================================================

async function demonstrateQueries() {
	console.log("\n📊 Demonstrating ORM Queries\n");

	// ------------------------------------------------------------------------
	// Basic Queries
	// ------------------------------------------------------------------------

	console.log("1️⃣  Find a user by ID");
	const user = await Users.find(1);
	console.log("   Result:", user);
	console.log();

	console.log("2️⃣  Get all users");
	const allUsers = await Users.all();
	console.log(`   Found ${allUsers.length} users`);
	console.log();

	console.log("3️⃣  Select specific columns");
	const userNames = await Users.select("id", "name", "email").all();
	console.log("   Users (id, name, email only):", userNames);
	console.log();

	console.log("4️⃣  Exclude sensitive columns");
	const publicUsers = await Users.exclude("password").all();
	console.log("   Users (without password):", publicUsers[0]);
	console.log();

	// ------------------------------------------------------------------------
	// Advanced Queries
	// ------------------------------------------------------------------------

	console.log("5️⃣  Where clause - find active users");
	const activeUsers = await Users.where("active", 1).all();
	console.log(`   Found ${activeUsers.length} active users`);
	console.log();

	console.log("6️⃣  Where with operators");
	const youngUsers = await Users.where("age", "<", 30).all();
	console.log(`   Found ${youngUsers.length} users under 30`);
	console.log();

	console.log("7️⃣  Limit results");
	const limitedUsers = await Users.limit(2).all();
	console.log(`   Limited to 2 users:`, limitedUsers.map((u) => u.name));
	console.log();

	console.log("8️⃣  Order by column");
	const orderedUsers = await Users.orderBy("name", "asc").all();
	console.log(
		"   Users ordered by name:",
		orderedUsers.map((u) => u.name),
	);
	console.log();

	console.log("9️⃣  Offset and limit (pagination)");
	const page2 = await Users.orderBy("id", "asc").offset(2).limit(2).all();
	console.log("   Page 2 (offset 2, limit 2):", page2.map((u) => u.name));
	console.log();

	console.log("🔟 First record");
	const firstUser = await Users.orderBy("id", "asc").first();
	console.log("   First user:", firstUser?.name);
	console.log();

	console.log("1️⃣1️⃣  Count records");
	const totalUsers = await Users.count();
	console.log(`   Total users: ${totalUsers}`);
	console.log();

	const activeCount = await Users.where("active", 1).count();
	console.log(`   Active users: ${activeCount}`);
	console.log();

	// ------------------------------------------------------------------------
	// Method Chaining
	// ------------------------------------------------------------------------

	console.log("1️⃣2️⃣  Complex chained query");
	const complexQuery = await Users.select("id", "name", "email", "age")
		.where("active", 1)
		.where("age", ">", 25)
		.orderBy("age", "desc")
		.limit(3)
		.all();
	console.log("   Active users over 25, ordered by age (desc), limit 3:");
	console.log(complexQuery);
	console.log();

	// ------------------------------------------------------------------------
	// Working with Related Data
	// ------------------------------------------------------------------------

	console.log("1️⃣3️⃣  Query related posts");
	const posts = await Posts.where("published", 1)
		.orderBy("created_at", "desc")
		.all();
	console.log(`   Found ${posts.length} published posts`);
	console.log();

	// Get posts for a specific user
	const userPosts = await Posts.where("user_id", 1).all();
	console.log(`   User 1 has ${userPosts.length} posts`);
	console.log();
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
	console.log(`
🚀 Bunary Basic ORM Example

This example demonstrates the @bunary/orm package usage with Model classes.
Using Eloquent-like pattern: Users.select() instead of Model.table("users").select()
`);

	try {
		// Initialize database
		initializeDatabase();

		// Demonstrate queries
		await demonstrateQueries();

		console.log("✅ All examples completed successfully!");
		console.log(`
📝 Next Steps:
- Modify the queries to experiment with different patterns
- Add your own tables and data
- Explore the query builder API
- Check the documentation: https://github.com/bunary-dev/orm
		`);
	} catch (error) {
		console.error("❌ Error:", error);
		if (error instanceof Error) {
			console.error("   Message:", error.message);
			console.error("   Stack:", error.stack);
		}
		process.exit(1);
	}
}

// Run the example
main();
