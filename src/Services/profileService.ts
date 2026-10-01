import { api } from './api';
import type {
  Profile,
  UpdateFullNamePayload,
  UpdateUsernamePayload,
  UpdateEmailPayload,
  UpdatePasswordPayload,
} from '../types/profile';

export const profileService = {
  getProfile: (): Promise<Profile> => api.get<Profile>('/profile'),

  updateFullName: (payload: UpdateFullNamePayload): Promise<Profile> =>
    api.put<Profile>('/profile/full-name', payload),

  updateUsername: (payload: UpdateUsernamePayload): Promise<Profile> =>
    api.put<Profile>('/profile/username', payload),

  updateEmail: (payload: UpdateEmailPayload): Promise<Profile> =>
    api.put<Profile>('/profile/email', payload),

  updatePassword: (payload: UpdatePasswordPayload): Promise<Profile> =>
    api.put<Profile>('/profile/password', payload),

  uploadAvatar: async (file: File): Promise<Profile> => {
    const formData = new FormData();
    formData.append('file', file);

    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(`${API_URL}/profile/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "Erreur lors de l'envoi de l'image.");
    }

    return response.json();
  },
};