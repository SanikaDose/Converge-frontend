"use client";

import React, { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProjectDetail } from "@/components/ProjectDetail";
import { useAppContext } from "@/context/AppContext";
import { hasInAppHistory, previousPath } from "@/lib/navHistory";

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
      // Return to the route the user came from (dashboard, Kanban, …). We push
      // that path rather than router.back(): the in-project view toggles add
      // their own ?view history entries now (so the *browser* Back steps through
      // views and stays in the project), and router.back() would only undo one
      // of those instead of actually leaving. previousPath() ignores those view
      // toggles, so it's the real prior page. Fallbacks cover a direct load.
      onBack={() => {
        const prev = previousPath();
        if (prev && prev !== `/projects/${params.id}`) router.push(prev);
        else if (hasInAppHistory()) router.back();
        else router.push("/");
      }}
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
