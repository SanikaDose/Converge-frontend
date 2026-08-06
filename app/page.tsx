"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { ProjectForm, type ProjectFormPayload } from "@/components/ProjectForm";
import { useAppContext } from "@/context/AppContext";
import { createProjectApi } from "@/lib/api";
import { roleCan } from "@/lib/data";

export default function DashboardPage() {
  const { role, actor } = useAppContext();
  const router = useRouter();
  const [showNewProject, setShowNewProject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const createProject = async (payload: ProjectFormPayload) => {
    if (!roleCan(role, "createProject")) return;
    setBusy(true);
    try {
      const project = await createProjectApi(payload);
      setShowNewProject(false);
      setRefreshKey((k) => k + 1);
      router.push(`/projects/${project.id}`);
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  return (
    <>
      <Dashboard
        actor={actor} refreshKey={refreshKey} onNew={() => setShowNewProject(true)}
        onOpen={(id) => router.push(`/projects/${id}`)}
      />
      {showNewProject && roleCan(role, "createProject") && (
        <ProjectForm
          title="New project" initial={null} submitLabel="Create project" busy={busy}
          onClose={() => setShowNewProject(false)} onSubmit={createProject}
        />
      )}
    </>
  );
}
