import { NextResponse, type NextRequest } from "next/server";
import { listProjectsIndex, createProject } from "@/lib/mockDb";

export async function GET() {
  return NextResponse.json(listProjectsIndex());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, customer, owner, startDate, endDate, weekOff } = body;
  if (!name || !customer || !startDate || !endDate) {
    return NextResponse.json({ error: "name, customer, startDate and endDate are required." }, { status: 400 });
  }
  const project = createProject({ name, type, customer, owner, startDate, endDate, weekOff });
  return NextResponse.json(project, { status: 201 });
}
