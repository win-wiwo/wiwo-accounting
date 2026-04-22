export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  _id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  createdBy: { _id: string; firstName: string; lastName: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
}
