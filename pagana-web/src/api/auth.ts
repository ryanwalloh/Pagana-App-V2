import { apiClient } from './client';
import type { AuthResponse, User } from './types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  phone_number?: string;
}

export const authApi = {
  /** This client only creates customer accounts; the role is not user-controlled. */
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      ...data,
      role: 'customer',
    });
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/me');
    return response.data;
  },
};
