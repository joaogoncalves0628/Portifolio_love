import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { useFonts as useJakartaFonts, PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { MemoryProvider } from '../context/MemoryContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

function AppNavigator() {
  const { status } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'unauthenticated'} redirectTo="/(tabs)/feed">
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'authenticated'} redirectTo="/">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-memory" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [playfairLoaded] = useFonts({ PlayfairDisplay_700Bold });
  const [jakartaLoaded] = useJakartaFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!playfairLoaded || !jakartaLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MemoryProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar style="light" />
              <AppNavigator />
            </GestureHandlerRootView>
          </MemoryProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
