"use client";

import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Bell, BellRing, AtSign, UserCheck, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  trigger?: ReactNode;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
};

const HINT_ITEMS = [
  { icon: AtSign, label: "Mentions", desc: "When someone @mentions you in a comment" },
  { icon: UserCheck, label: "Assignments", desc: "When an issue is assigned to you" },
  { icon: GitPullRequest, label: "Status changes", desc: "On issues you're watching" },
];

const NotificationDropdown = ({ trigger, defaultOpen, align = "end" }: Props) => {
  const defaultTrigger = (
    <div className="rounded-full p-2 hover:bg-accent relative cursor-pointer">
      <BellRing className="size-4" />
    </div>
  );

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu defaultOpen={defaultOpen}>
        <DropdownMenuTrigger>{trigger ?? defaultTrigger}</DropdownMenuTrigger>

        <DropdownMenuContent align={align} className="p-0 w-80 rounded-2xl">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
              <p className="text-base font-semibold">Notifications</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <Separator />

          <div className="flex flex-col items-center gap-3 py-8 px-5 text-center">
            <span className="size-12 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
              <Bell size={20} className="text-muted-foreground/40" strokeWidth={1.5} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">All caught up</p>
              <p className="text-xs text-muted-foreground">You'll be notified here for:</p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-1">
              {HINT_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40 text-left">
                  <item.icon size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NotificationDropdown;
