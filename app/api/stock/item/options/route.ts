import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ item_groups: [], stock_uoms: [] });
}
