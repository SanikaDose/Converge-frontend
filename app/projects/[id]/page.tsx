"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectDetail } from "@/components/ProjectDetail";
import { useAppContext } from "@/context/AppContext";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { actor } = useAppContext();

  return <ProjectDetail projectId={params.id} actor={actor} onBack={() => router.push("/")} />;
}
