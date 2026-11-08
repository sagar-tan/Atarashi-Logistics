import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Package } from 'lucide-react-native';

function AuthRouteGate() {
  const { session, isLoading, onboardingStatus } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = segments[0] as string | undefined;

    if (!session) {
      // 1. Mandatory Login Gate: Unauthenticated users MUST be on /auth
      if (currentSegment !== 'auth') {
        router.replace('/auth');
      }
    } else {
      // 2. User is authenticated
      const isOnboarded = onboardingStatus?.onboarding_completed;

      if (!isOnboarded) {
        // User has not finished onboarding -> Gate to /onboarding
        if (currentSegment !== 'onboarding') {
          router.replace('/onboarding' as any);
        }
      } else {
        // User is onboarded -> Gate away from auth or onboarding to Home /
        if (currentSegment === 'auth' || currentSegment === 'onboarding') {
          router.replace('/');
        }
      }
    }
  }, [session, isLoading, onboardingStatus, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.emblemCard}>
          <Package size={36} color="#0F172A" />
        </View>
        <Text style={styles.splashTitle}>ATARASHI LOGISTICS</Text>
        <Text style={styles.splashSubtitle}>India's Electric Courier Network</Text>
        <ActivityIndicator size="small" color="#0F172A" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F9FA' },
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthRouteGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emblemCard: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  splashSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
