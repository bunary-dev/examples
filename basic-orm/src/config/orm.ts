/**
 * ORM Configuration
 *
 * Database configuration for @bunary/orm
 */
import { defineOrmConfig } from "@bunary/orm";

const dbPath = "./example.sqlite";

export default defineOrmConfig({
	database: {
		type: "sqlite",
		sqlite: {
			path: dbPath,
		},
	},
});

// Export dbPath for use in database initialization
export { dbPath };
