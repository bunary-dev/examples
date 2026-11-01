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
});
