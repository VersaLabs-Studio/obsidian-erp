// app/api/stock/settings/warehouse-defaults/route.ts
// Obsidian ERP v4.0 — Global default-warehouse settings (2U §B / 2T §2 T1 fix).
//
// Reads/writes the warehouse defaults that live on two ERPNext singles:
//   - Stock Settings:          default_warehouse              (source)
//   - Manufacturing Settings:  default_fg_warehouse           (finished goods)
//                              default_wip_warehouse          (work-in-progress)
//                              default_scrap_warehouse        (scrap / rejected)
//
// 2U §B — BOUNDARY FIX. The 2T client lib (`lib/stock/warehouse-defaults.ts`)
// imported the server-only `frappeClient` singleton directly and was marked
// "use client". That singleton self-instantiates at module load and reads
// ERP_API_KEY / ERP_API_SECRET (server-only env), so any client page that
// imported the lib threw "Missing ERP API environment variables" on mount —
// crashing the Sales Order detail page AND this very settings page. The lib
// is now a thin fetch wrapper around THIS route; the ERPNext client lives
// only here, on the server, where the env vars exist.
//
// User-scoped client: ERPNext runs its native DocPerm engine for the
// requesting user. Writing the singles requires the appropriate role
// (System/Stock/Manufacturing Manager); a user without it gets a clean 403
// surfaced through `handleError` rather than a silent service-account write.

import { NextRequest, NextResponse } from "next/server";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { frappeClient } from "@/lib/frappe-client";

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized",
      details: "No valid session.",
      statusCode: 401,
    },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  const client = getRequestClient(request);
  if (!client) return unauthorized();
  try {
    const [mfg, stock] = await Promise.all([
      client.db.getDoc("Manufacturing Settings", "Manufacturing Settings"),
      client.db.getDoc("Stock Settings", "Stock Settings"),
    ]);
    const m = (mfg ?? {}) as Record<string, unknown>;
    const s = (stock ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      data: {
        sourceWarehouse: String(s.default_warehouse ?? ""),
        fgWarehouse: String(m.default_fg_warehouse ?? ""),
        wipWarehouse: String(m.default_wip_warehouse ?? ""),
        scrapWarehouse: String(m.default_scrap_warehouse ?? ""),
      },
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}

export async function PUT(request: NextRequest) {
  const client = getRequestClient(request);
  if (!client) return unauthorized();
  try {
    const body = (await request.json()) as {
      sourceWarehouse?: string;
      fgWarehouse?: string;
      wipWarehouse?: string;
      scrapWarehouse?: string;
    };

    // ERPNext clears a Link field when sent null (an empty string can trip
    // "field does not exist" link validation on some builds), so coalesce
    // blanks to null.
    const orNull = (v?: string) => (v && v.trim() ? v.trim() : null);

    await Promise.all([
      client.db.updateDoc(
        "Manufacturing Settings",
        "Manufacturing Settings",
        {
          default_fg_warehouse: orNull(body.fgWarehouse),
          default_wip_warehouse: orNull(body.wipWarehouse),
          default_scrap_warehouse: orNull(body.scrapWarehouse),
        },
      ),
      client.db.updateDoc("Stock Settings", "Stock Settings", {
        default_warehouse: orNull(body.sourceWarehouse),
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sourceWarehouse: body.sourceWarehouse ?? "",
        fgWarehouse: body.fgWarehouse ?? "",
        wipWarehouse: body.wipWarehouse ?? "",
        scrapWarehouse: body.scrapWarehouse ?? "",
      },
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
