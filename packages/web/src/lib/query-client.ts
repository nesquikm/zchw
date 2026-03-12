import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Mock data doesn't change
      refetchOnWindowFocus: false,
    },
  },
});
