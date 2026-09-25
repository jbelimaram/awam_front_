import { api, ApiError, handleUnauthorized } from './api';
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
    const endpoint = '/profile/avatar';
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      let message = "Erreur lors de l'envoi de l'image.";

      if (errorData?.detail) {
        if (typeof errorData.detail === 'string') {
          message = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          message = errorData.detail
            .map((err: { loc?: (string | number)[]; msg: string }) =>
              err.loc ? `${err.loc[err.loc.length - 1]} : ${err.msg}` : err.msg
            )
            .join(' — ');
        }
      }

      if (response.status === 401) {
        handleUnauthorized(endpoint);
      }

      throw new ApiError(response.status, message);
    }

    return response.json();
  },
};