import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { JournalTheme } from '@/constants/theme';
import { useAuthStore } from '@/stores/use-auth-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    async function prepare() {
      try {
        await initAuth();
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, [initAuth]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: JournalTheme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/login"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="itinerary/[id]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="attraction/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </>
  );
}
