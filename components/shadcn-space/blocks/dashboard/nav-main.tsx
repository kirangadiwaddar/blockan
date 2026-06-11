"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { NavItem } from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Recursive render function
  const renderItem = (item: NavItem) => {
    //  Section label
    if (item.isSection && item.label) {
      return (
        <SidebarGroup key={item.label} className="p-0 pt-5 first:pt-0">
          <SidebarGroupLabel className="p-0 text-xs font-medium capitalize text-muted-foreground">
            {item.label}
          </SidebarGroupLabel>
        </SidebarGroup>
      );
    }
    const hasChildren = !!item.children?.length;
    // Item with children → collapsible
    if (hasChildren && item.title) {
      return (
        <SidebarGroup key={item.title} className="p-0">
          <SidebarMenu>
            <Collapsible>
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="rounded-xl text-sm px-3 py-2 h-9 cursor-pointer"
                    >
                      {item.icon && <item.icon size={16} />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 collapsible/button-[aria-expanded='true']:rotate-90" />
                    </SidebarMenuButton>
                  }
                  className="w-full collapsible/button"
                />
                <CollapsibleContent>
                  <SidebarMenuSub className="me-0 pe-0">
                    {item.children!.map(renderItemSub)}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      );
    }
    // Item without children
    if (item.title) {
      const segment = item.href?.split("/").pop();
      const pathSegment = pathname.split("/").pop();
      const projectSubPages = ["board", "backlog", "sprints", "timeline", "reports"];
      const isActive =
        item.isActive ??
        (item.href === pathname ||
          (!!segment && projectSubPages.includes(segment) && pathSegment === segment));

      return (
        <SidebarGroup key={item.title} className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={item.title}
                className={cn(
                  "rounded-lg text-sm px-3 py-2 h-9 ",
                  isActive
                    ? "bg-primary hover:bg-primary text-primary-foreground hover:text-primary-foreground"
                    : "",
                )}
              >
                {item.icon && <item.icon />}
                <Link href={item.href ?? "#"} className="w-full">
                  {item.title}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      );
    }
    return null;
  };
  // Recursive render function for sub-items
  const renderItemSub = (item: NavItem) => {
    const hasChildren = !!item.children?.length;
    if (hasChildren && item.title) {
      return (
        <SidebarMenuSubItem key={item.title}>
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <SidebarMenuSubButton className="rounded-xl text-sm px-3 py-2 h-9">
                {item.icon && <item.icon />}
                <span>{item.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 data-[state=open]:rotate-90" />
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className="me-0 pe-0">
                {item.children!.map(renderItemSub)}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuSubItem>
      );
    }
    if (item.title) {
      return (
        <SidebarMenuSubItem key={item.title} className="w-full">
          <SidebarMenuSubButton
            className="w-full"
            render={<Link href={item.href ?? "#"}>{item.title}</Link>}
          />
        </SidebarMenuSubItem>
      );
    }
    return null;
  };

  return <>{items.map(renderItem)}</>;
}
