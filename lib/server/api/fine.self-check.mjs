import assert from "node:assert/strict";
import { fineFor } from "./fine.ts";

assert.equal(fineFor("2026-06-18", "2026-06-18"), 0);
assert.equal(fineFor("2026-06-17", "2026-06-18"), 0);
assert.equal(fineFor("2026-06-19", "2026-06-18"), 2000);
assert.equal(fineFor("2026-06-21", "2026-06-18"), 6000);
console.log("fine self-check passed (4 cases)");
