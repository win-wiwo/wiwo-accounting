import { UserRole } from '../constants/roles';

export interface User {
  _id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithDepartment extends User {
  department?: {
    _id: string;
    name: string;
    code: string;
  } | null;
}

export interface CreateUserDto {
  employeeId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  departmentId?: string | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
