import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { SUPPRESS_ERROR_TOAST } from '@/lib/toastErrors';
import { apiClient } from './client';

export interface CustomerProfile {
  id: number;
  display_name: string;
  preferred_contact_phone: string;
  default_delivery_notes: string;
  created_at: string;
  updated_at: string;
}

export type CustomerProfileUpdate = Partial<
  Pick<CustomerProfile, 'display_name' | 'preferred_contact_phone' | 'default_delivery_notes'>
>;

export const customersApi = {
  getProfile: async (): Promise<CustomerProfile> => {
    const response = await apiClient.get<CustomerProfile>('/customer/profile');
    return response.data;
  },

  updateProfile: async (update: CustomerProfileUpdate): Promise<CustomerProfile> => {
    const response = await apiClient.patch<CustomerProfile>('/customer/profile', update);
    return response.data;
  },
};

const PROFILE_KEY = ['customer-profile'] as const;

export function useCustomerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: customersApi.getProfile,
    enabled: user?.role === 'customer',
    meta: SUPPRESS_ERROR_TOAST,
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.updateProfile,
    meta: SUPPRESS_ERROR_TOAST,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_KEY, profile);
    },
  });
}
