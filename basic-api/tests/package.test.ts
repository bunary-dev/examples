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

describe("dependencies", () => {
  it("targets core ^0.4.0 and http ^0.7.2 from npm", () => {
    expect(pkg.dependencies["@bunary/core"]).toBe("^0.4.0");
    expect(pkg.dependencies["@bunary/http"]).toBe("^0.7.2");
  });

  it("has a typecheck script", () => {
    expect((pkg.scripts as Record<string, string>).typecheck).toBe("tsc --noEmit");
  });
});
