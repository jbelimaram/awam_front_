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
    const API_URL = import.meta.env.VITE_API_URL;
    window.location.href = `${API_URL}/auth/google`;
  },

  logout: (): Promise<void> => api.post<void>('/auth/logout'),

  getCurrentUser: (): Promise<User> => api.get<User>('/auth/me'),

  forgotPassword: (payload: ForgotPasswordPayload): Promise<void> =>
    api.post<void>('/auth/forgot-password', payload),

  resetPassword: (
    token: string,
    payload: ResetPasswordPayload
  ): Promise<void> => api.post<void>(`/auth/reset-password/${token}`, payload),
};