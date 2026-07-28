import assert from "node:assert/strict";
import test from "node:test";
import { bookingRequestInputSchema } from "./index.js";

const jobId = "5bc2637f-a48f-4f04-93a8-8e70287c214d";

test("booking requests accept a valid job id and a concise proposal", () => {
  const result = bookingRequestInputSchema.safeParse({
    jobId,
    notes: "Available and ready for this shift.",
  });

  assert.equal(result.success, true);
});

test("booking requests reject redacted or malformed job ids", () => {
  assert.equal(
    bookingRequestInputSchema.safeParse({ jobId: "redacted-clinic" }).success,
    false,
  );
  assert.equal(
    bookingRequestInputSchema.safeParse({ jobId: "not-a-uuid" }).success,
    false,
  );
});

test("booking requests reject blank and oversized proposals", () => {
  assert.equal(
    bookingRequestInputSchema.safeParse({ jobId, notes: "   " }).success,
    false,
  );
  assert.equal(
    bookingRequestInputSchema.safeParse({ jobId, notes: "a".repeat(501) })
      .success,
    false,
  );
});
