"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectDetail } from "@/components/ProjectDetail.jsx";
import { useAppContext } from "@/context/AppContext.jsx";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { actor } = useAppContext();

  return <ProjectDetail projectId={id} actor={actor} onBack={() => router.push("/")} />;
}
