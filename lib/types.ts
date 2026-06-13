export type IssueStatus = "Todo" | "In Progress" | "Reviewing" | "Completed" | "Cancelled";
export type IssuePriority = "Critical" | "High" | "Medium" | "Low";
export type IssueType = "Bug" | "Story" | "Task" | "Epic";

export type Member = {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  role: string;
  email?: string;
  isPending?: boolean;
};

export type Issue = {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: IssueType;
  status: string; // IssueStatus | custom column id
  priority: IssuePriority;
  assignees: Member[];
  reporter: Member;
  sprintId?: string;
  projectId: string;
  storyPoints?: number;
  dueDate?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: "active" | "planned" | "completed";
};

export type Project = {
  id: string;
  key: string;
  code: string;
  name: string;
  description: string;
  color: string;
  members: Member[];
  openIssues: number;
  totalIssues: number;
  progress: number;
  updatedAt: string;
  status: "active" | "archived";
};
