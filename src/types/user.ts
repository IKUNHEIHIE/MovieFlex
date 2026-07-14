export interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
