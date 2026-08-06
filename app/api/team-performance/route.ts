import { NextResponse } from "next/server";
import { listProjectDetails } from "@/lib/mockDb";
import { aggregateTeamPerformance } from "@/lib/businessLogic";
import { todayISO } from "@/lib/dateUtils";

export async function GET() {
  const rows = aggregateTeamPerformance(listProjectDetails(), todayISO());
  return NextResponse.json(rows);
}
