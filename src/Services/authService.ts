import { api } from './api';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  User,
} from '../types/auth';

export const authService = {
  login: (payload: LoginPayload): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/register', payload),

loginWithGoogle: (): void => {
  console.log('🔵 REDIRECTION DANS LE MÊME ONGLET');
  // Redirige la page actuelle vers Google (pas de pop-up)
  const API_URL = import.meta.env.VITE_API_URL;
  window.location.href = `${API_URL}/auth/google`;
  //window.location.href = "http://localhost:8000/auth/google";
},

  logout: (): Promise<void> => api.post<void>('/auth/logout'),

  getCurrentUser: (): Promise<User> => api.get<User>('/auth/me'),

  forgotPassword: (payload: ForgotPasswordPayload): Promise<void> =>
    api.post<void>('/auth/forgot-password', payload),

  resetPassword: (
    token: string,
    payload: ResetPasswordPayload
  ): Promise<void> => api.post<void>(`/auth/reset-password/${token}`, payload),


  //updateProfile: (payload: { username?: string; full_name?: string; email?: string }): Promise<User> =>
  //api.patch<User>('/auth/me', payload),

  //changePassword: (payload: { current_password: string; new_password: string }): Promise<void> =>
  //api.post<void>('/auth/change-password', payload),

};