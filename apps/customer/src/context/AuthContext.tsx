import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface OnboardingProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  account_type: 'personal' | 'business';
  company_name: string | null;
  gstin: string | null;
  city: string | null;
  default_address: string | null;
  default_pincode: string | null;
  preferred_vehicle: 'bike' | 'auto' | 'car' | 'pickup';
}

export interface OnboardingStatus {
  is_new_user: boolean;
  onboarding_completed: boolean;
  step_count: number;
  steps_required: string[];
  next_step: string;
  profile: OnboardingProfile;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  onboardingStatus: OnboardingStatus | null;
  refreshStatus: () => Promise<OnboardingStatus | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  onboardingStatus: null,
  refreshStatus: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  const fetchStatus = async (currentSession: Session): Promise<OnboardingStatus | null> => {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://atarashi-logistics-api.onrender.com';
    try {
      const res = await fetch(`${apiBase}/v1/user/onboarding-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (res.ok) {
        const data = (await res.json()) as OnboardingStatus;
        setOnboardingStatus(data);
        return data;
      }
    } catch {
      // In case of local network issue, fallback to direct Supabase profile query
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (profile) {
        const isNewUser = !profile.full_name || !profile.city;
        const isCompleted = Boolean(profile.onboarding_completed);
        const steps = isCompleted
          ? []
          : isNewUser
          ? ['profile', 'location', ...(profile.account_type === 'business' ? ['business'] : []), 'welcome']
          : ['location'];

        const fallbackStatus: OnboardingStatus = {
          is_new_user: isNewUser,
          onboarding_completed: isCompleted,
          step_count: steps.length,
          steps_required: steps,
          next_step: steps[0] || 'complete',
          profile: {
            id: currentSession.user.id,
            full_name: profile.full_name ?? null,
            email: profile.email ?? currentSession.user.email ?? null,
            phone: profile.phone ?? currentSession.user.phone ?? null,
            account_type: profile.account_type ?? 'personal',
            company_name: profile.company_name ?? null,
            gstin: profile.gstin ?? null,
            city: profile.city ?? null,
            default_address: profile.default_address ?? null,
            default_pincode: profile.default_pincode ?? null,
            preferred_vehicle: profile.preferred_vehicle ?? 'bike',
          },
        };
        setOnboardingStatus(fallbackStatus);
        return fallbackStatus;
      }
    } catch (err) {
      console.warn('[AuthContext] Fallback profile query failed:', err);
    }

    return null;
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial session hydration from hardware KeyStore
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session) {
        fetchStatus(session).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // 2. Real-time auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        await fetchStatus(newSession);
      } else {
        setOnboardingStatus(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshStatus = async (): Promise<OnboardingStatus | null> => {
    if (!session) return null;
    return await fetchStatus(session);
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setOnboardingStatus(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        onboardingStatus,
        refreshStatus,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
