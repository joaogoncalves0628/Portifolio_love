import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BookOpenText, CalendarDays, Heart, Plus, Sparkles, UsersRound } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ComponentRef, RefObject } from 'react';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { TabBarBlurContext } from '../../components/TabBarBlurTarget';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type NativeView = ComponentRef<typeof View>;

// Componente individual para cada aba animada
function AnimatedTabItem({ route, isFocused, label, colors, onPress }: any) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 180,
    });
  }, [isFocused, progress]);

  const iconMap = {
    feed: BookOpenText,
    calendar: CalendarDays,
    favorites: Heart,
    profile: UsersRound,
  };

  const Icon = iconMap[route.name as keyof typeof iconMap] ?? Sparkles;

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['rgba(255, 255, 255, 0)', colors.panel]
      ),
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: 1 + progress.value * 0.12 },
        { translateY: -progress.value * 1.5 },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.65 + progress.value * 0.35,
      transform: [{ scale: 0.96 + progress.value * 0.04 }],
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      onPress={() => {
        if (!isFocused && Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
        onPress();
      }}
      style={[styles.tabButton, containerAnimatedStyle]}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Icon
          size={20}
          strokeWidth={isFocused ? 2.4 : 1.8}
          color={isFocused ? colors.primary : colors.textMuted}
        />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          textAnimatedStyle,
          {
            color: isFocused ? colors.text : colors.textMuted,
            fontFamily: isFocused ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
          },
        ]}
      >
        {label}
      </Animated.Text>
    </AnimatedPressable>
  );
}

// Botão central para adicionar uma memória
function CenterAddButton({ colors }: any) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/add-memory');
  };

  return (
    <View style={styles.centerWrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar memória"
        onPress={handlePress}
        style={[styles.centerButtonShadow, { shadowColor: colors.primary }]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButton}
        >
          <Plus size={24} color="#fff" strokeWidth={2.4} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const blurContext = useContext(TabBarBlurContext);
  const activeBlurTarget = blurContext?.targets[state.routes[state.index]?.name];

  const routeMap: Record<string, string> = {
    feed: '/(tabs)/feed',
    calendar: '/(tabs)/calendar',
    favorites: '/(tabs)/favorites',
    profile: '/(tabs)/profile',
  };

  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.barContainer}>
        <BlurView
          blurTarget={activeBlurTarget}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          blurReductionFactor={2}
          intensity={75}
          tint="dark"
          style={[
            styles.blurBackground,
            {
              backgroundColor: 'rgba(20, 8, 12, 0.68)',
              borderColor: 'rgba(255, 255, 255, 0.14)',
            },
          ]}
        />

        <View style={styles.tabContent}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.title || route.name;

            return (
              <Fragment key={route.key}>
                {index === 2 && <CenterAddButton colors={colors} />}

                <AnimatedTabItem
                  route={route}
                  isFocused={isFocused}
                  label={label}
                  colors={colors}
                  onPress={() => {
                    const target = routeMap[route.name];
                    if (target) {
                      router.replace(target as any);
                      return;
                    }
                    navigation.navigate(route.name);
                  }}
                />
              </Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const [targets, setTargets] = useState<Record<string, RefObject<NativeView | null>>>({});
  const registerTarget = useCallback(
    (routeName: string, target: RefObject<NativeView | null> | null) => {
      setTargets((current) => {
        if (target) {
          return current[routeName] === target ? current : { ...current, [routeName]: target };
        }

        if (!current[routeName]) {
          return current;
        }
        const next = { ...current };
        delete next[routeName];
        return next;
      });
    },
    [],
  );
  const blurContext = useMemo(() => ({ targets, registerTarget }), [registerTarget, targets]);

  return (
    <TabBarBlurContext.Provider value={blurContext}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="feed" options={{ title: 'Álbum' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Datas' }} />
        <Tabs.Screen name="favorites" options={{ title: 'Curtidos' }} />
        <Tabs.Screen name="profile" options={{ title: 'Nós Dois' }} />
      </Tabs>
    </TabBarBlurContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    zIndex: 10,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  barContainer: {
    height: 68,
    width: '100%',
    maxWidth: 480,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 14,
  },
  blurBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: '100%',
  },
  tabButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginHorizontal: 1,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0,
  },
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    zIndex: 5,
  },
  centerButtonShadow: {
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    overflow: 'hidden',
  },
});