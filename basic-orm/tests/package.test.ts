/**
 * Package metadata tests
 *
 * Examples are never published; guard against accidental `npm publish`.
 */

import { describe, expect, it } from "bun:test";
import pkg from "../package.json";

describe("package.json", () => {
  it("is private", () => {
    expect((pkg as { private?: boolean }).private).toBe(true);
  });

  it("targets the 0.4.0 bunary baseline from npm", () => {
    expect(pkg.dependencies).toEqual({
      "@bunary/core": "^0.4.0",
      "@bunary/orm": "^0.4.0",
      "drizzle-orm": "^0.45.0",
    });
  });
});
