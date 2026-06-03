// tests/smoke.test.ts
// Obsidian ERP v4.0 - Smoke Unit Test
// Verifies the test harness is working

import { describe, it, expect } from "vitest";
import { buildIdempotencyKey, getAutomationGuard } from "@/lib/flows/idempotency";

describe("Smoke Test — Test Harness", () => {
  it("should pass a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("can import project modules", () => {
    expect(buildIdempotencyKey).toBeDefined();
    expect(typeof buildIdempotencyKey).toBe("function");
  });

  it("buildIdempotencyKey produces deterministic keys", () => {
    const key1 = buildIdempotencyKey("Sales Order", "SO-001", "create_work_orders");
    const key2 = buildIdempotencyKey("Sales Order", "SO-001", "create_work_orders");
    expect(key1).toBe(key2);
    expect(key1).toBe("Sales Order:SO-001:create_work_orders");
  });

  it("buildIdempotencyKey includes target doctype when provided", () => {
    const key = buildIdempotencyKey("Sales Order", "SO-001", "create", "Delivery Note");
    expect(key).toBe("Sales Order:SO-001:create:Delivery Note");
  });

  it("getAutomationGuard returns config for known automations", () => {
    const guard = getAutomationGuard("Sales Order", "create_work_orders");
    expect(guard).toBeDefined();
    expect(guard?.targetDoctype).toBe("Work Order");
    expect(guard?.linkField).toBe("sales_order");
  });

  it("getAutomationGuard returns undefined for unknown automations", () => {
    const guard = getAutomationGuard("Foo", "bar");
    expect(guard).toBeUndefined();
  });
});
