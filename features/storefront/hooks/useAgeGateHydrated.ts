import { useSyncExternalStore } from 'react';
import { useAgeGateStore } from '../stores/useAgeGateStore';

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const persist = useAgeGateStore.persist;
  if (!persist || persist.hasHydrated()) {
    return () => {};
  }

  return persist.onFinishHydration(onStoreChange);
}

function getClientSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const persist = useAgeGateStore.persist;
  return persist?.hasHydrated() ?? true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useAgeGateHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
