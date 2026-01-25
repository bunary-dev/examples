/**
 * BaseModel - Base class for Eloquent-like models
 *
 * Extend this class to create model classes that map to database tables.
 * Each model should set the `tableName` property to the table it represents.
 *
 * @example
 * ```ts
 * class Users extends BaseModel {
 *   protected static tableName = "users";
 * }
 *
 * // Then use it like:
 * const users = await Users.all();
 * const user = await Users.find(1);
 * ```
 */

import { Model, type QueryBuilder } from "@bunary/orm";

export abstract class BaseModel {
	/**
	 * The table name this model represents
	 * Must be set by subclasses
	 */
	protected static tableName: string;

	/**
	 * Get a query builder instance for this model's table
	 */
	protected static query(): QueryBuilder {
		if (!this.tableName) {
			throw new Error(
				`Model ${this.constructor.name} must define a tableName property`,
			);
		}
		return Model.table(this.tableName);
	}

	/**
	 * Find a record by ID
	 */
	static async find(id: string | number) {
		return this.query().find(id);
	}

	/**
	 * Get all records
	 */
	static async all() {
		return this.query().all();
	}

	/**
	 * Select specific columns
	 */
	static select(...columns: string[]): QueryBuilder {
		return this.query().select(...columns);
	}

	/**
	 * Exclude specific columns
	 */
	static exclude(...columns: string[]): QueryBuilder {
		return this.query().exclude(...columns);
	}

	/**
	 * Add a where clause
	 */
	static where(
		column: string,
		operatorOrValue: string | number | boolean,
		value?: string | number | boolean,
	): QueryBuilder {
		return this.query().where(column, operatorOrValue, value);
	}

	/**
	 * Limit the number of results
	 */
	static limit(count: number): QueryBuilder {
		return this.query().limit(count);
	}

	/**
	 * Offset the results
	 */
	static offset(count: number): QueryBuilder {
		return this.query().offset(count);
	}

	/**
	 * Order the results
	 */
	static orderBy(
		column: string,
		direction?: "asc" | "desc",
	): QueryBuilder {
		return this.query().orderBy(column, direction);
	}

	/**
	 * Get the first record
	 */
	static async first() {
		return this.query().first();
	}

	/**
	 * Count the records
	 */
	static async count() {
		return this.query().count();
	}
}
