"use client";
import React, { useTransition, useState, useMemo } from "react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarProvider,
} from "@/components/ui/sidebar";
import Logo from "@/assets/logo/logo";
import { NavMain } from "@/components/shadcn-space/blocks/dashboard/nav-main";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LucideIcon, Grid3x2, ListTree, SquareStack, CalendarDays, BookText,
  FolderRoot, ChartPie, Users, Settings, Menu, X,
  LogOut, CircleUserRound, ChevronUp, ChevronDown, Check, FolderKanban, Search,
} from "lucide-react";
import { SiteHeader } from "@/components/shadcn-space/blocks/dashboard/site-header";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useUser } from "@/lib/supabase/user-context";
import { useProjects } from "@/lib/projects-context";
import { signOut } from "@/lib/supabase/auth-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  label?: string;
  isSection?: boolean;
  title?: string;
  icon?: LucideIcon;
  href?: string;
  children?: NavItem[];
  isActive?: boolean;
};

const PAGES_NAV: NavItem[] = [
  { label: "Pages", isSection: true },
  { title: "Analytics", icon: ChartPie,  href: "/dashboard" },
  { title: "Projects",  icon: FolderRoot, href: "/projects" },
  { title: "Team",      icon: Users,      href: "/team" },
];

function buildWorkspaceNav(slug: string): NavItem[] {
  return [
    { title: "Board",    icon: Grid3x2,     href: `/projects/${slug}/board`    },
    { title: "Backlog",  icon: ListTree,    href: `/projects/${slug}/backlog`  },
    { title: "Sprints",  icon: SquareStack, href: `/projects/${slug}/sprints`  },
    { title: "Timeline", icon: CalendarDays,href: `/projects/${slug}/timeline` },
    { title: "Reports",  icon: BookText,    href: `/projects/${slug}/reports`  },
  ];
}

/* ── Project switcher ────────────────────────────────────── */
function ProjectSwitcher({
  projects,
  selectedSlug,
  onSelect,
}: {
  projects: { id: string; name: string; key: string; color: string }[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const selected = projects.find((p) => p.id === selectedSlug) ?? projects[0];
  if (!selected) return null;

  const filtered = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  const MAX = 6;
  const visible = filtered.slice(0, MAX);
  const hasMore = filtered.length > MAX;

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setQuery(""); }}>
      <DropdownMenuTrigger className="w-full focus:outline-none">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors cursor-pointer group w-full border border-border/60 bg-muted/30">
          <span className={cn("avatar-orb size-4 rounded-full shrink-0", selected.color)} />
          <span className="text-xs font-medium truncate flex-1 text-left">{selected.name}</span>
          <ChevronDown size={11} className="text-muted-foreground shrink-0" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={6} className="w-52 p-1.5 rounded-xl">
        {/* Search */}
        <div className="flex items-center gap-1.5 px-2 py-1 mb-1 rounded-md border border-input bg-muted/40">
          <Search size={11} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <Separator className="mb-1" />

        {/* Project list — scrollable if > MAX */}
        <div className={cn("flex flex-col gap-0.5", hasMore && "overflow-y-auto max-h-[216px]")}>
          {visible.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2 text-center">No projects found</p>
          ) : visible.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="gap-2 cursor-pointer rounded-lg py-1.5 px-2"
            >
              <span className={cn("avatar-orb size-5 rounded-full shrink-0", p.color)} />
              <span className="text-xs flex-1 truncate">{p.name}</span>
              {p.id === selectedSlug && <Check size={12} className="text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
        </div>

        <Separator className="my-1" />
        <DropdownMenuItem
          onClick={() => router.push("/projects")}
          className="gap-2 cursor-pointer text-muted-foreground text-xs rounded-lg"
        >
          <FolderKanban size={13} /> All projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Sidebar user profile dropdown ───────────────────────── */
function SidebarUserMenu() {
  const router = useRouter();
  const { displayName, email, avatarUrl, initials } = useUser();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        description="You'll be redirected to the login page."
        confirmLabel="Sign out"
        destructive
        loading={isPending}
        onConfirm={() => { setConfirmOpen(false); handleSignOut(); }}
        onCancel={() => setConfirmOpen(false)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger className="w-full focus:outline-none">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer w-full">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <span className="text-sm font-medium truncate leading-tight">{displayName || "Loading…"}</span>
              <span className="text-xs text-muted-foreground truncate leading-tight">{email}</span>
            </div>
            <ChevronUp size={14} className="text-muted-foreground shrink-0" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={18}
          className="w-56 rounded-xl p-1.5 z-99999"
        >
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <Separator className="mb-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer gap-2 text-sm" onClick={() => router.push("/settings")}>
              <CircleUserRound size={14} className="text-muted-foreground" /> Profile & Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <Separator className="my-1" />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2 text-sm"
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut size={14} /> {isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/* ── Sidebar inner content (shared between mobile/desktop) ── */
function SidebarNav({
  projects,
  selectedSlug,
  onSelect,
}: {
  projects: { id: string; name: string; key: string; color: string }[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  const workspaceNav = useMemo(() => buildWorkspaceNav(selectedSlug), [selectedSlug]);

  return (
    <>
      {/* Pages */}
      <NavMain items={PAGES_NAV} />

      {/* Workspace section */}
      <div className="pt-5">
        <p className="text-xs font-medium capitalize text-muted-foreground mb-2 px-1">Workspace</p>
        {projects.length > 0 && (
          <div className="mb-2">
            <ProjectSwitcher
              projects={projects}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
            />
          </div>
        )}
        <NavMain items={workspaceNav} />
      </div>

    </>
  );
}

/* ── AppSidebar ───────────────────────────────────────────── */
const AppSidebar = ({ children }: { children: React.ReactNode }) => {
  useKeyboardShortcuts();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { projects } = useProjects();
  const pathname = usePathname();

  // Auto-detect selected project from the current URL
  const detectedSlug = useMemo(() => {
    const match = pathname.match(/\/projects\/([^/]+)/);
    if (match) {
      const slug = match[1];
      if (projects.some((p) => p.id === slug)) return slug;
    }
    return null;
  }, [pathname, projects]);

  const [manualSlug, setManualSlug] = useState<string | null>(null);

  // Manual selection overrides URL detection; reset when URL changes project
  const selectedSlug = manualSlug ?? detectedSlug ?? projects[0]?.id ?? "";

  const handleSelect = (slug: string) => {
    setManualSlug(slug);
    router.push(`/projects/${slug}/board`);
  };

  const typedProjects = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name, key: p.key ?? p.name.slice(0, 2).toUpperCase(), color: p.color ?? "avatar-orb-blue" })),
    [projects]
  );

  return (
    <SidebarProvider>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-9999 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <Logo />
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded-md hover:bg-muted cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col h-[calc(100vh-65px)]">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <SidebarNav projects={typedProjects} selectedSlug={selectedSlug} onSelect={handleSelect} />
          </div>
          <div className="px-3 py-3 border-t">
            <SidebarUserMenu />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <Sidebar className="py-4 pb-0 px-0 bg-background hidden md:flex">
        <div className="flex flex-col h-full bg-background">
          {/* Logo */}
          <SidebarHeader className="py-0 px-4 shrink-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <a href="/dashboard" className="w-full h-full">
                  <Logo />
                </a>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="overflow-hidden gap-0 px-0 flex-1">
            <SimpleBar autoHide={true} className="flex-1 h-[calc(100vh-100px)]">
              <div className="px-4 pt-4">
                <SidebarNav projects={typedProjects} selectedSlug={selectedSlug} onSelect={handleSelect} />
              </div>
            </SimpleBar>
          </SidebarContent>

          {/* User profile at bottom */}
          <div className="px-3 pb-4 pt-2 border-t shrink-0">
            <SidebarUserMenu />
          </div>
        </div>
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b px-4 md:px-6 py-3 bg-background">
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-muted cursor-pointer shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>
          <SiteHeader />
        </header>
        <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
};

export default AppSidebar;
