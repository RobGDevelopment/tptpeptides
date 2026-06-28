'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  calculateEbitdaWaterfall,
  type ProformaWaterfallInput,
  type ProformaWaterfallResult,
} from './waterfall';

export interface ProformaVariables {
  grossRevenue: number;
  cac: number;
  cogsPercent: number;
  merchantFeePercent: number;
  churnPercent: number;
  gpSplitPercent: number;
  lpSplitPercent: number;
  opex: number;
}

const DEFAULT_VARIABLES: ProformaVariables = {
  grossRevenue: 250_000,
  cac: 12_000,
  cogsPercent: 42,
  merchantFeePercent: 3.2,
  churnPercent: 4,
  gpSplitPercent: 20,
  lpSplitPercent: 80,
  opex: 35_000,
};

interface ProformaContextValue {
  variables: ProformaVariables;
  setVariable: <K extends keyof ProformaVariables>(key: K, value: ProformaVariables[K]) => void;
  resetVariables: () => void;
  waterfall: ProformaWaterfallResult;
}

const ProformaContext = createContext<ProformaContextValue | null>(null);

export function ProformaProvider({ children }: { children: ReactNode }) {
  const [variables, setVariables] = useState<ProformaVariables>(DEFAULT_VARIABLES);

  const setVariable = useCallback(
    <K extends keyof ProformaVariables>(key: K, value: ProformaVariables[K]) => {
      setVariables((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const resetVariables = useCallback(() => {
    setVariables(DEFAULT_VARIABLES);
  }, []);

  const waterfall = useMemo(() => {
    const input: ProformaWaterfallInput = {
      grossRevenue: variables.grossRevenue,
      cac: variables.cac,
      cogsPercent: variables.cogsPercent,
      merchantFeePercent: variables.merchantFeePercent,
      churnPercent: variables.churnPercent,
      gpSplitPercent: variables.gpSplitPercent,
      lpSplitPercent: variables.lpSplitPercent,
      opex: variables.opex,
    };
    return calculateEbitdaWaterfall(input);
  }, [variables]);

  const value = useMemo(
    () => ({
      variables,
      setVariable,
      resetVariables,
      waterfall,
    }),
    [variables, setVariable, resetVariables, waterfall]
  );

  return <ProformaContext.Provider value={value}>{children}</ProformaContext.Provider>;
}

export function useProforma(): ProformaContextValue {
  const context = useContext(ProformaContext);
  if (!context) {
    throw new Error('useProforma must be used within ProformaProvider');
  }
  return context;
}

export { DEFAULT_VARIABLES as PROFORMA_DEFAULT_VARIABLES };
