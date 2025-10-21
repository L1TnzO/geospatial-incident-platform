import { QueryClient } from '@tanstack/react-query';

const DEFAULT_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: false,
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        ...DEFAULT_QUERY_OPTIONS,
      },
    },
  });
