import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VERSION } from "../src/core/version.js";

const root = fileURLToPath(new URL("..", import.meta.url));

test("package.json version matches VERSION", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.version, VERSION);
});

test("CHANGELOG.md contains an entry for VERSION", () => {
  const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  assert.match(changelog, new RegExp(`\\[${VERSION.replaceAll(".", "\\.")}\\]`));
});
