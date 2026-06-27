import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AgeGateState {
  isVerified: boolean;
  verify: () => void;
  reset: () => void;
}

export const useAgeGateStore = create<AgeGateState>()(
  persist(
    (set) => ({
      isVerified: false,
      verify: () => set({ isVerified: true }),
      reset: () => set({ isVerified: false }),
    }),
    {
      name: 'tpt-age-verified',
      partialize: (state) => ({ isVerified: state.isVerified }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[AgeGate] Failed to restore saved verification state', error);
        }
      },
    }
  )
);
