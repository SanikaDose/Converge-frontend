import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const patch = await request.json();
  const project = updateProject(id, patch);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(project);
}
