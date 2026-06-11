"use client";

import { useState } from "react";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectSheet } from "@/components/projects/create-project-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProjects } from "@/lib/projects-context";
import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Plus, SearchIcon, FolderOpen, Search as SearchEmpty } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProjectsPage() {
  const { projects, addProject, deleteProject, loading } = useProjects();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppSidebar>
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">{projects.length} projects</p>
          </div>
          <div className="flex items-center gap-3">
            <InputGroup className="h-9 rounded-md">
              <InputGroupInput
                placeholder="Search projects"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <InputGroupAddon>
                <SearchIcon size={16} />
              </InputGroupAddon>
            </InputGroup>
            <Button onClick={() => setSheetOpen(true)} className="cursor-pointer h-9">
              <Plus size={16} /> New Project
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-16 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            : filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => setDeleteTarget(project)}
                />
              ))
          }
        </div>

        {!loading && projects.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create your first project to start tracking issues, sprints, and your team's work."
            actions={[{ label: "Create project", onClick: () => setSheetOpen(true) }]}
          />
        )}
        {!loading && projects.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={SearchEmpty}
            title="No projects match your search"
            description={`Try a different keyword — no project name or key contains "${search}".`}
            actions={[{ label: "Clear search", onClick: () => setSearch(""), variant: "outline" }]}
          />
        )}
      </div>

      <CreateProjectSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={(p) => addProject(p)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete project?"
        description={`"${deleteTarget?.name}" and all its issues will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete project"
        destructive
        onConfirm={async () => {
          if (deleteTarget) await deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppSidebar>
  );
}
