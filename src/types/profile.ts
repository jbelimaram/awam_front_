export interface Profile {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  has_password: boolean;
}

export interface UpdateFullNamePayload {
  full_name: string;
}

export interface UpdateUsernamePayload {
  username: string;
}

export interface UpdateEmailPayload {
  email: string;
}

export interface UpdatePasswordPayload {
  current_password?: string;
  new_password: string;
  confirm_password: string;
}