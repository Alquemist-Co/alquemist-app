export type UserRole =
  | "operator"
  | "supervisor"
  | "manager"
  | "admin"
  | "viewer";

export interface AuthClaims {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
  facilityId: string | null;
}
