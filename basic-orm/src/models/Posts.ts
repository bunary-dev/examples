/**
 * Posts Model
 *
 * Represents the posts table in the database.
 * Use this model to query post data.
 *
 * @example
 * ```ts
 * import { Posts } from "./models/Posts.js";
 *
 * // Get all published posts
 * const posts = await Posts.where("published", 1).all();
 *
 * // Get posts for a user
 * const userPosts = await Posts.where("user_id", 1).all();
 * ```
 */

import { BaseModel } from "@bunary/orm";

export class Posts extends BaseModel {
	protected static tableName = "posts";
}
