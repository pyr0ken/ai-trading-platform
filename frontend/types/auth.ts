export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface TeamUserSession {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
