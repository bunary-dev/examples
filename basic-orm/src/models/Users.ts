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

import { BaseModel } from "./BaseModel.js";

export class Users extends BaseModel {
	protected static tableName = "users";
	protected static protected = ["password", "secret_key"];
	protected static timestamps = true; // Exclude createdAt and updatedAt
}
