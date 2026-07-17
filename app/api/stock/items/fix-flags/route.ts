// app/api/stock/items/fix-flags/route.ts
// 2Y-R3 — One-time migration: ensure ALL items have is_sales_item=1 + is_purchase_item=1.
// Call GET /api/stock/items/fix-flags once, then delete this file.

import { NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Array<{ name: string; ok: boolean; error?: string }> = [];
  let start = 0;
  const limit = 100;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // frappe-js-sdk: getDocList (not getList)
      const items = await frappeClient.db.getDocList("Item", {
        fields: ["name", "is_sales_item", "is_purchase_item"],
        filters: [["disabled", "=", 0]] as any,
        orderBy: { field: "name", order: "asc" },
        limit,
        start,
      } as any);

      if (!items || items.length === 0) break;

      for (const item of items) {
        const needsSales = Number(item.is_sales_item) !== 1;
        const needsPurchase = Number(item.is_purchase_item) !== 1;

        if (!needsSales && !needsPurchase) continue;

        try {
          await frappeClient.db.updateDoc("Item", item.name, {
            is_sales_item: 1,
            is_purchase_item: 1,
          } as any);
          results.push({ name: item.name, ok: true });
        } catch (err) {
          results.push({
            name: item.name,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (items.length < limit) break;
      start += limit;
    }

    const fixed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);

    return NextResponse.json({
      success: true,
      fixed,
      failed: failed.length,
      failures: failed,
      message: `Fixed ${fixed} item(s). ${failed.length} failed.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
