import { Capacitor } from '@capacitor/core';

export const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};
