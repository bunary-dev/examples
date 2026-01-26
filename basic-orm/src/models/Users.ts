/**
 * Users Model
 *
 * Represents the users table in the database.
 * Use this model to query user data.
 *
 * @example
 * ```ts
 * import { Users } from "./models/Users.js";
 *
 * // Get all users
 * const users = await Users.all();
 *
 * // Find a user by ID
 * const user = await Users.find(1);
 *
 * // Query with conditions
 * const activeUsers = await Users.where("active", 1).all();
 * ```
 */

import { BaseModel } from "@bunary/orm";

export class Users extends BaseModel {
	protected static tableName = "users";
	// Protected fields: automatically excluded from all query results
	// These columns must exist in the database schema: password, secret_key
	protected static protected = ["password", "secret_key"];
	// Timestamps: automatically excluded from all query results
	// These columns must exist in the database schema: createdAt, updatedAt
	protected static timestamps = true;
}
