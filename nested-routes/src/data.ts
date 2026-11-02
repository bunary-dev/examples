/**
 * In-memory data for the example.
 *
 * Each router gets its own store, so tests (or several routers in one
 * process) never share state.
 */

export interface User {
	id: string;
	name: string;
	email: string;
}

export interface Post {
	id: string;
	title: string;
	authorId: string;
}

export interface Store {
	users: User[];
	posts: Post[];
	/** Next id per resource; ids are never reused after a delete. */
	nextId: { users: number; posts: number };
}

export function createStore(): Store {
	return {
		users: [
			{ id: "1", name: "Alice", email: "alice@example.com" },
			{ id: "2", name: "Bob", email: "bob@example.com" },
			{ id: "3", name: "Charlie", email: "charlie@example.com" },
		],
		posts: [
			{ id: "1", title: "Hello World", authorId: "1" },
			{ id: "2", title: "Getting Started with Bunary", authorId: "1" },
			{ id: "3", title: "TypeScript Tips", authorId: "2" },
		],
		nextId: { users: 4, posts: 4 },
	};
}
