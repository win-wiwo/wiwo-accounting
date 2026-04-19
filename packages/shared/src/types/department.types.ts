export interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  headId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentWithHead extends Department {
  head?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
}
