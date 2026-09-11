export type Role = 'admin' | 'member';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  _id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  progress: number;
  assigneeId?: string;
  dependencies: string[];
  status: TaskStatus;
}
