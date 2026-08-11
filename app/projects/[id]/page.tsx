"use client";

import React, { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProjectDetail } from "@/components/ProjectDetail";
import { useAppContext } from "@/context/AppContext";
import { hasInAppHistory } from "@/lib/navHistory";

function ProjectDetailRoute() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const { actor } = useAppContext();

  return (
    <ProjectDetail
      projectId={params.id}
      actor={actor}
      // Set by the portfolio Kanban when you click a card — opens that task expanded.
      initialTaskId={search.get("task")}
      // Step back rather than pushing "/": pushing stacked a new entry, so
      // browser Back returned *into* the project the user had just left, and
      // it always landed on the Dashboard even when they'd come from Kanban.
      // Falling back to "/" covers a direct link, where there's no history.
      onBack={() => { if (hasInAppHistory()) router.back(); else router.push("/"); }}
    />
  );
}

// useSearchParams needs a Suspense boundary above it, or Next bails out of
// prerendering the whole route.
export default function ProjectDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProjectDetailRoute />
    </Suspense>
  );
}
