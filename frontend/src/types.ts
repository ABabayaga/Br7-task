export type Role = 'admin' | 'member';

export const SECTORS = [
  'diretoria',
  'diretoria_executiva',
  'diretoria_criacao',
  'criacao',
  'desenvolvimento',
] as const;

export type Sector = (typeof SECTORS)[number];

export const SECTOR_LABELS: Record<Sector, string> = {
  diretoria: 'Diretoria',
  diretoria_executiva: 'Diretoria Executiva',
  diretoria_criacao: 'Diretoria de Criação',
  criacao: 'Criação',
  desenvolvimento: 'Desenvolvimento',
};

export interface ServiceType {
  _id: string;
  name: string;
  active: boolean;
}

export interface StageTemplate {
  _id: string;
  serviceTypeId: string;
  order: number;
  name: string;
  defaultSector: Sector;
  defaultDurationDays: number;
}

export interface Client {
  _id: string;
  name: string;
  active: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  setor?: Sector;
}

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
  clientId: string;
  serviceTypeId: string;
  startDate: string;
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
  setor?: Sector;
  sourceStageTemplateId?: string;
}
