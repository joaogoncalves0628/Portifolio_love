import { BlurTargetView } from 'expo-blur';
import { createContext, useContext, useEffect, useRef } from 'react';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { View } from 'react-native';

type NativeView = ComponentRef<typeof View>;

type TabBarBlurContextValue = {
  targets: Record<string, RefObject<NativeView | null>>;
  registerTarget: (routeName: string, target: RefObject<NativeView | null> | null) => void;
};

export const TabBarBlurContext = createContext<TabBarBlurContextValue | null>(null);

export function TabBarBlurTarget({
  routeName,
  children,
}: {
  routeName: string;
  children: ReactNode;
}) {
  const context = useContext(TabBarBlurContext);
  const targetRef = useRef<NativeView | null>(null);
  const registerTarget = context?.registerTarget;

  if (!registerTarget) {
    throw new Error('TabBarBlurTarget must be used within TabBarBlurContext.Provider');
  }

  useEffect(() => {
    registerTarget(routeName, targetRef);
    return () => registerTarget(routeName, null);
  }, [registerTarget, routeName, targetRef]);

  return (
    <BlurTargetView ref={targetRef} style={{ flex: 1 }}>
      {children}
    </BlurTargetView>
  );
}
