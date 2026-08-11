"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { useAppContext } from "@/context/AppContext";

export default function DashboardPage() {
  const { actor } = useAppContext();
  const router = useRouter();

  return (
    <Dashboard actor={actor} onOpen={(id) => router.push(`/projects/${id}`)} />
  );
}
