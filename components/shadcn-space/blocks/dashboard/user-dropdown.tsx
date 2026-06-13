"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleUserRound, LayoutDashboard, FolderRoot, Settings, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers";
import { useUser } from "@/lib/supabase/user-context";
import { signOut } from "@/lib/supabase/auth-actions";

type Props = {
  trigger: ReactNode;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
};

const itemClass = "px-3 py-2 text-sm font-medium cursor-pointer gap-2.5 rounded-lg";

const UserDropdown = ({ trigger, defaultOpen, align = "end" }: Props) => {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { user, displayName, email, avatarUrl, initials } = useUser();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => { await signOut(); });
  };

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu defaultOpen={defaultOpen}>
        <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className="w-64 rounded-2xl p-0 data-open:slide-in-from-bottom-20! data-closed:slide-out-to-bottom-20 data-open:fade-in-0 data-closed:fade-out-0 data-closed:zoom-out-100 duration-400"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="relative shrink-0">
              <Avatar>
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback colorSeed={user?.id}>{initials || "U"}</AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">{displayName || "Loading…"}</span>
              <span className="text-xs text-muted-foreground truncate">{email}</span>
            </div>
            <Badge className="bg-blue-500/10 text-blue-500 font-normal text-xs ml-auto shrink-0">Pro</Badge>
          </div>

          <Separator />

          <DropdownMenuGroup className="p-1.5">
            <DropdownMenuItem className={itemClass} onClick={() => router.push("/dashboard")}>
              <LayoutDashboard size={15} className="text-muted-foreground" /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className={itemClass} onClick={() => router.push("/projects")}>
              <FolderRoot size={15} className="text-muted-foreground" /> My Projects
            </DropdownMenuItem>
            <DropdownMenuItem className={itemClass} onClick={() => router.push("/settings")}>
              <CircleUserRound size={15} className="text-muted-foreground" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className={itemClass} onClick={() => router.push("/settings")}>
              <Settings size={15} className="text-muted-foreground" /> Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <Separator />

          <div className="p-1.5">
            <DropdownMenuItem className={itemClass} onClick={toggle}>
              {theme === "dark" ? <Sun size={15} className="text-muted-foreground" /> : <Moon size={15} className="text-muted-foreground" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" className={itemClass} disabled={isPending} onClick={handleSignOut}>
              <LogOut size={15} />
              {isPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserDropdown;
