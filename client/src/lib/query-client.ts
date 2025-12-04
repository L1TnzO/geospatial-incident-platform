import { QueryClient } from '@tanstack/react-query';

import { get, set, del } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';

const DEFAULT_QUERY_OPTIONS = {
  staleTime: 30_000,
  gcTime: 1000 * 60 * 60 * 24, // 24 hours
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

export const createIDBPersister = (idbValidKey: IDBValidKey = 'reactQuery'): Persister => {
  return {
    persistClient: async (client: any) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return await get<any>(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  } as Persister;
};
