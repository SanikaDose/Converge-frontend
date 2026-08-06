import { NextResponse } from "next/server";
import { TEAMS, EMPLOYEES } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ teams: TEAMS, employees: EMPLOYEES });
}
