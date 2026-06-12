import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { authApi, type LoginCredentials, type SignupData } from '@/api/auth';
import { useAuth } from '@/features/auth/AuthProvider';

function useRedirectTarget(): string {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from;
  return from?.pathname ?? '/dashboard';
}

export const useLogin = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const redirectTo = useRedirectTarget();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setSession(data);
      navigate(redirectTo, { replace: true });
    },
  });
};

export const useSignup = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const redirectTo = useRedirectTarget();

  return useMutation({
    mutationFn: (data: SignupData) => authApi.signup(data),
    onSuccess: (data) => {
      setSession(data);
      navigate(redirectTo, { replace: true });
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return () => {
    logout();
    navigate('/', { replace: true });
  };
};
