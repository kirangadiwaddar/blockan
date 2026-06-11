"use client";

import { Project } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { progressColor } from "@/lib/utils";
import { Trash2, MoreHorizontal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const STATUS_COLOR: Record<string, string> = {
  active:   "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  paused:   "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  archived: "bg-muted text-muted-foreground",
};

export function ProjectCard({ project, onDelete }: { project: Project; onDelete?: () => void }) {
  const base = `/projects/${project.id}`;

  return (
    <Card className="rounded-2xl flex flex-col">
      <CardContent className="flex flex-col gap-4 p-5 flex-1">
        {/* Header: orb + title + badge + menu */}
        <div className="flex items-start gap-3">
          <div className={`avatar-orb ${project.color} size-11 rounded-full shrink-0 mt-0.5`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-snug">{project.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {project.description || `${project.key} · ${project.members.length} members`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={`text-xs capitalize border ${STATUS_COLOR[project.status] ?? ""}`}
            >
              {project.status}
            </Badge>
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button className="p-0.5 rounded hover:bg-muted cursor-pointer transition-colors">
                      <MoreHorizontal size={13} className="text-muted-foreground" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2" onClick={onDelete}>
                    <Trash2 size={13} /> Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-1.5" indicatorClassName={progressColor(project.progress)} />
        </div>
      </CardContent>

      {/* Footer: avatars + open count | links */}
      <CardFooter className="flex items-center justify-between gap-3 px-5 py-3.5 border-t">
        <div className="flex items-center gap-2">
          <AvatarGroup>
            {project.members.slice(0, 4).map((m) => (
              <Avatar key={m.id} className="size-6 ring-1 ring-background">
                <AvatarImage src={m.avatar} alt={m.name} />
                <AvatarFallback className="text-[9px]">{m.initials}</AvatarFallback>
              </Avatar>
            ))}
            {project.members.length > 4 && (
              <AvatarGroupCount className="size-6 text-[9px]">+{project.members.length - 4}</AvatarGroupCount>
            )}
          </AvatarGroup>
          <span className="text-[11px] text-muted-foreground">{project.openIssues} open</span>
        </div>

        <Button variant="secondary" size="xs" className="cursor-pointer" nativeButton={false} render={<Link href={`${base}/board`} className="flex items-center gap-1">Board <ArrowRight size={10} /></Link>} />
      </CardFooter>
    </Card>
  );
}
