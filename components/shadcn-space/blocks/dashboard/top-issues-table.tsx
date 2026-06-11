"use client";

import {
  LucideIcon,
  AppWindowMac,
  HandMetal,
  Megaphone,
  Contrast,
  Brush,
  FolderPlus,
  FolderPen,
  FolderMinus,
  SearchIcon,
  EllipsisVertical,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";


interface TableAction {
  icon: LucideIcon;
  listtitle: string;
}

interface ProjectData {
  project: string;
  date: string;
  budget: string;
  icon: LucideIcon;
  iconcolor: string;
  iconbg: string;
  avatar: string;
  name: string;
  handle: string;
  progress: number;
  progressColor: string;
}

const TopIssuesTable = () => {

 const topIssues = [
  {
    code: "PH-001",
    issue: "Login page is not responsive",
    date: "12 Jun 2026",
    status: "In Progress",
    priority: "High",
    assignees: [
      {
        name: "John Carter",
        image: "https://i.pravatar.cc/150?img=1",
        fallback: "JC",
      },
      {
        name: "Sarah Lee",
        image: "https://i.pravatar.cc/150?img=5",
        fallback: "SL",
      },
      {
        name: "David Smith",
        image: "https://i.pravatar.cc/150?img=8",
        fallback: "DS",
      },
    ],
    extraAssignees: 4,
  },
  {
    code: "PH-021",
    issue: "Dashboard table overflow on mobile",
    date: "13 Jun 2026",
    status: "In Review",
    priority: "Medium",
    assignees: [
      {
        name: "Emma Wilson",
        image: "https://i.pravatar.cc/150?img=9",
        fallback: "EW",
      },
      {
        name: "Alex Brown",
        image: "https://i.pravatar.cc/150?img=12",
        fallback: "AB",
      },
    ],
    extraAssignees: 2,
  },
  {
    code: "PH-013",
    issue: "Notification count not updating",
    date: "14 Jun 2026",
    status: "Todo",
    priority: "Low",
    assignees: [
      {
        name: "Michael Scott",
        image: "https://i.pravatar.cc/150?img=15",
        fallback: "MS",
      },
    ],
    extraAssignees: 0,
  },
  {
    code: "WE-030",
    issue: "Project creation form validation failed",
    date: "15 Jun 2026",
    status: "Testing",
    priority: "High",
    assignees: [
      {
        name: "Olivia Taylor",
        image: "https://i.pravatar.cc/150?img=20",
        fallback: "OT",
      },
      {
        name: "Ryan Cooper",
        image: "https://i.pravatar.cc/150?img=22",
        fallback: "RC",
      },
      {
        name: "Sophia White",
        image: "https://i.pravatar.cc/150?img=25",
        fallback: "SW",
      },
    ],
    extraAssignees: 1,
  },
  {
    code: "OR-001",
    issue: "Kanban drag and drop not persisting",
    date: "16 Jun 2026",
    status: "Blocked",
    priority: "Critical",
    assignees: [
      {
        name: "James Miller",
        // image: "https://i.pravatar.cc/150?img=28",
        fallback: "JM",
      },
      {
        name: "Ella Johnson",
        image: "https://i.pravatar.cc/150?img=30",
        fallback: "EJ",
      },
      {
        name: "Noah Davis",
        image: "https://i.pravatar.cc/150?img=33",
        fallback: "ND",
      },
    ],
    extraAssignees: 5,
  },
  {
    code: "OR-006",
    issue: "Dark mode colors inconsistent",
    date: "17 Jun 2026",
    status: "Done",
    priority: "Medium",
    assignees: [
      {
        name: "Grace Martin",
        image: "https://i.pravatar.cc/150?img=35",
        fallback: "GM",
      },
      {
        name: "Daniel Moore",
        image: "https://i.pravatar.cc/150?img=38",
        fallback: "DM",
      },
    ],
    extraAssignees: 0,
  },
  {
    code: "OR-026",
    issue: "Dark mode colors inconsistent",
    date: "17 Jun 2026",
    status: "Done",
    priority: "Medium",
    assignees: [
      {
        name: "Grace Martin",
        image: "https://i.pravatar.cc/150?img=35",
        fallback: "GM",
      },
      {
        name: "Daniel Moore",
        image: "https://i.pravatar.cc/150?img=38",
        fallback: "DM",
      },
    ],
    extraAssignees: 0,
  },
  
];

  return (
    <Card className="w-full h-full pb-0 pt-6 gap-6">
      <CardHeader className="sm:flex items-center justify-between px-6">
        <div>
          <CardTitle className="leading-normal">Top Issues</CardTitle>
          <CardDescription>
            Checkout the statistics of top issues
          </CardDescription>
        </div>
        <InputGroup className="h-9 rounded-md w-fit">
          <InputGroupInput placeholder="Search" />
          <InputGroupAddon>
            <SearchIcon size={18} />
          </InputGroupAddon>
        </InputGroup>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table className="min-w-2xl">
            <TableHeader>
              <TableRow className="hover:bg-transparent!">
                <TableHead className="p-3 ps-6">Code</TableHead>
                <TableHead className="p-2">Issue</TableHead>
                <TableHead className="p-2">Status</TableHead>
                <TableHead className="p-2">Priority</TableHead>
                <TableHead className="p-2 text-center">Assignees</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border dark:divide-darkborder">
              {topIssues.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="whitespace-nowrap p-3 ps-6">
                    <span>{item.code}</span>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div>
                      <h6 className="text-sm font-medium">{item.issue}</h6>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <p className="text-sm text-foreground">{item.status}</p>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <Badge
                      className={
                        item.priority === "High"
                          ? "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400"
                          : item.priority === "Medium"
                            ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
                            : item.priority === "Low"
                              ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                              : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                      }
                    >
                      {item.priority}
                    </Badge>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center justify-end px-4">
                      <div className="*:data-[slot=avatar]:ring-background *:data-[slot=avatar]:dark:ring-muted flex -space-x-2 *:data-[slot=avatar]:ring-2">
                        {item.assignees.map((user) => (
                          <Avatar key={user.name}>
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback>{user.fallback}</AvatarFallback>
                          </Avatar>
                        ))}

                        {item.extraAssignees > 0 && (
                          <AvatarGroupCount className="text-card-foreground font-medium">
                            +{item.extraAssignees}
                          </AvatarGroupCount>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopIssuesTable;
