import { NextResponse, type NextRequest } from "next/server";
import { updateTicket } from "@/lib/mockDb";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = await request.json();
  const ticket = updateTicket(id, patch);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json(ticket);
}
