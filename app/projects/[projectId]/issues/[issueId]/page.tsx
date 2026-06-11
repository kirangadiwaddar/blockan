"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";

function IssuePermalinkContent() {
  const params = useParams<{ projectId: string; issueId: string }>();
  const { projects, projectBySlug } = useProjects();
  const { issues, loading, updateIssue } = useIssues();

  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const project = projectBySlug?.(params.projectId) ?? projects.find((p) => p.id === params.projectId);
  const issue = issues.find((i) => i.id === params.issueId);

  useEffect(() => {
    if (!loading && issue) {
      setSheetOpen(true);
    }
  }, [loading, issue?.id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inner = (
    <div className="flex flex-col h-full">
      {/* Breadcrumb header */}
      <div className="flex items-center gap-3 px-5 h-12 border-b shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          render={<Link href={`/projects/${params.projectId}/board`} />}
          nativeButton={false}
        >
          <ArrowLeft size={12} />
          Back to board
        </Button>
        <Separator orientation="vertical" className="h-4" />
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : issue ? (
          <>
            <span className="text-xs text-muted-foreground font-mono">{issue.code}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-medium truncate max-w-xs">{issue.title}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Issue not found</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={copyLink}
          >
            <Link2 size={12} />
            {copied ? "Copied!" : "Copy link"}
          </Button>
          {project && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              render={<Link href={`/projects/${params.projectId}/board`} />}
              nativeButton={false}
            >
              <ExternalLink size={12} />
              Open board
            </Button>
          )}
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : issue ? (
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-1">
              <Link2 size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{issue.code} · {issue.title}</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              The issue detail panel is open on the right. You can also{" "}
              <Link
                href={`/projects/${params.projectId}/board?issue=${issue.id}`}
                className="text-primary underline underline-offset-2"
              >
                view it on the board
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <p className="text-sm font-medium text-muted-foreground">Issue not found</p>
            <p className="text-xs text-muted-foreground">
              This issue may have been deleted or you may not have access.
            </p>
          </div>
        )}
      </div>

      <IssueDetailSheet
        issue={issue ?? null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={updateIssue}
      />
    </div>
  );

  return <AppSidebar>{inner}</AppSidebar>;
}

export default function IssuePermalinkPage() {
  return (
    <Suspense>
      <IssuePermalinkContent />
    </Suspense>
  );
}
