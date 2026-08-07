import { NextResponse } from "next/server";
import { getDashboardBaseline } from "@/lib/mockDb";

export async function GET() {
  return NextResponse.json(getDashboardBaseline());
}
