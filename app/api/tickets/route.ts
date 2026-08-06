import { NextResponse, type NextRequest } from "next/server";
import { listTickets, createTicket } from "@/lib/mockDb";

export async function GET() {
  return NextResponse.json(listTickets());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, projectId, phase, assignedTo, priority } = body;
  if (!title || !projectId) {
    return NextResponse.json({ error: "title and projectId are required." }, { status: 400 });
  }
  const ticket = createTicket({ title, description, projectId, phase, assignedTo, priority });
  return NextResponse.json(ticket, { status: 201 });
}
