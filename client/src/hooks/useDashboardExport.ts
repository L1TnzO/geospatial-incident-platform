import { useRef, useReducer } from 'react';
import { flushSync } from 'react-dom';
import { exportDashboardCsv, DashboardServiceError } from '../services/dashboard-service';
import type {
  DashboardExportParams,
  DashboardExportOptions,
  DashboardExportResult,
} from '../types/api/dashboard';

export interface UseDashboardExportResult {
  export: (
    params?: DashboardExportParams,
    options?: DashboardExportOptions,
  ) => Promise<DashboardExportResult>;
  isExporting: boolean;
  exportError: DashboardServiceError | null;
  cancelExport: () => void;
  reset: () => void;
}

interface State {
  isExporting: boolean;
  exportError: DashboardServiceError | null;
}

type Action =
  | { type: 'START_EXPORT' }
  | { type: 'EXPORT_SUCCESS' }
  | { type: 'EXPORT_ERROR'; error: DashboardServiceError }
  | { type: 'RESET' }
  | { type: 'CANCEL' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_EXPORT':
      return { isExporting: true, exportError: null };
    case 'EXPORT_SUCCESS':
      return { ...state, isExporting: false };
    case 'EXPORT_ERROR':
      return { isExporting: false, exportError: action.error };
    case 'RESET':
    case 'CANCEL':
      return { isExporting: false, exportError: null };
    default:
      return state;
  }
}

export const useDashboardExport = (): UseDashboardExportResult => {
  const abortController = useRef<AbortController | null>(null);
  const currentPromise = useRef<Promise<DashboardExportResult> | null>(null);

  const [state, dispatch] = useReducer(reducer, {
    isExporting: false,
    exportError: null,
  });

  const exportFn = async (
    params: DashboardExportParams = {},
    options?: DashboardExportOptions,
  ): Promise<DashboardExportResult> => {
    abortController.current = new AbortController();
    flushSync(() => {
      dispatch({ type: 'START_EXPORT' });
    });

    const signal = abortController.current.signal;

    try {
      const res = await exportDashboardCsv(params, options, signal);
      currentPromise.current = null;
      flushSync(() => {
        dispatch({ type: 'EXPORT_SUCCESS' });
      });
      return res;
    } catch (err) {
      currentPromise.current = null;
      dispatch({ type: 'EXPORT_ERROR', error: err as DashboardServiceError });
      throw err;
    } finally {
      abortController.current = null;
    }
  };

  const cancelExport = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    if (currentPromise.current) {
      currentPromise.current.catch(() => {});
      currentPromise.current = null;
    }
    dispatch({ type: 'CANCEL' });
  };

  const reset = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    if (currentPromise.current) {
      currentPromise.current.catch(() => {});
      currentPromise.current = null;
    }
    flushSync(() => {
      dispatch({ type: 'RESET' });
    });
  };

  return {
    export: exportFn,
    isExporting: state.isExporting,
    exportError: state.exportError,
    cancelExport,
    reset,
  };
};
