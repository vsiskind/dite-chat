import { useEffect } from 'react';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useFrameworkReady();
  const { session, loading } = useSupabaseAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.frameworkReady) {
      window.frameworkReady();
    }
  }, []);

  // Check for Supabase environment variables
  const missingEnvVars = !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  // If environment variables are missing, show setup screen
  if (missingEnvVars) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Setup Required</Text>
          <Text style={styles.message}>
            Please connect your Supabase project by clicking the "Connect to Supabase" button in the top right.
          </Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  // Always render a Slot for the router to work properly
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="(tabs)" 
          redirect={!session || (session.user && !session.user.email_confirmed_at)}
        />
        <Stack.Screen 
          name="auth" 
          options={{ headerShown: false }} 
          redirect={!!session && session.user?.email_confirmed_at !== null}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F6F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
  },
  loadingText: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});