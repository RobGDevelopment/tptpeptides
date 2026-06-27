export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
