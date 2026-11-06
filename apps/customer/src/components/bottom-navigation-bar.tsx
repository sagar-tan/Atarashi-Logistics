/**
 * bottom-navigation-bar.tsx
 * Floating Neomorphic Bottom Navigation Bar for Atarashi Logistics.
 *
 * Modeled after the Atarashi EcoCharge custom floating tab bar:
 * - Floating elevated capsule bar with smooth border and deep neomorphic shadow
 * - 4 Primary navigation tabs: Dispatch (Home), Activity (Tracking & Orders), Saved Places, and Wallet
 * - Center elevated Quick-Action FAB (Black circular capsule with white icon)
 * - Strict White, Grey, and Black luxury monochromatic styling (Zero green tints)
 * - Tactile spring feedback and safe-area inset compensation
 */

import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  MapPin,
  Package,
  Plus,
  Wallet,
} from 'lucide-react-native';

import { theme } from '@/theme/theme';

const { colors, shadows, radius } = theme;

export type CustomerNavigationTab =
  | 'dispatch'
  | 'activity'
  | 'saved_places'
  | 'wallet';

export interface BottomNavigationBarProps {
  activeTab: CustomerNavigationTab;
  onTabChange: (tab: CustomerNavigationTab) => void;
  onCenterFabPress?: () => void;
  activeOrderCount?: number;
}

export function BottomNavigationBar({
  activeTab,
  onTabChange,
  onCenterFabPress,
  activeOrderCount = 0,
}: BottomNavigationBarProps) {
  const insets = useSafeAreaInsets();
  const fabScale = useRef(new Animated.Value(1)).current;

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  const bottomOffset = Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 16);

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.floatingBar}>
        {/* Left Tab 1: Dispatch / Home */}
        <TouchableOpacity
          onPress={() => onTabChange('dispatch')}
          activeOpacity={0.8}
          style={styles.tabButton}
          accessibilityRole="tab"
          accessibilityLabel="Dispatch Home"
        >
          <View
            style={[
              styles.iconCircle,
              activeTab === 'dispatch' && styles.iconCircleActive,
            ]}
          >
            <Package
              size={20}
              color={activeTab === 'dispatch' ? colors.dark : colors.textMuted}
              strokeWidth={activeTab === 'dispatch' ? 2.4 : 1.8}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'dispatch' && styles.tabLabelActive,
            ]}
          >
            Dispatch
          </Text>
        </TouchableOpacity>

        {/* Left Tab 2: Activity / Orders */}
        <TouchableOpacity
          onPress={() => onTabChange('activity')}
          activeOpacity={0.8}
          style={styles.tabButton}
          accessibilityRole="tab"
          accessibilityLabel="Orders and Tracking Activity"
        >
          <View
            style={[
              styles.iconCircle,
              activeTab === 'activity' && styles.iconCircleActive,
            ]}
          >
            <Clock
              size={20}
              color={activeTab === 'activity' ? colors.dark : colors.textMuted}
              strokeWidth={activeTab === 'activity' ? 2.4 : 1.8}
            />
            {activeOrderCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>{activeOrderCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'activity' && styles.tabLabelActive,
            ]}
          >
            Activity
          </Text>
        </TouchableOpacity>

        {/* Center Primary Action: Quick Book FAB */}
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onCenterFabPress || (() => onTabChange('dispatch'))}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={styles.centerFab}
            accessibilityRole="button"
            accessibilityLabel="Instant Dispatch Quick Action"
          >
            <View style={styles.fabInner}>
              <Plus size={24} color={colors.onDark} strokeWidth={2.8} />
            </View>
            <Text style={styles.fabLabel}>Send</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Right Tab 1: Saved Places */}
        <TouchableOpacity
          onPress={() => onTabChange('saved_places')}
          activeOpacity={0.8}
          style={styles.tabButton}
          accessibilityRole="tab"
          accessibilityLabel="Saved Places and Addresses"
        >
          <View
            style={[
              styles.iconCircle,
              activeTab === 'saved_places' && styles.iconCircleActive,
            ]}
          >
            <MapPin
              size={20}
              color={activeTab === 'saved_places' ? colors.dark : colors.textMuted}
              strokeWidth={activeTab === 'saved_places' ? 2.4 : 1.8}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'saved_places' && styles.tabLabelActive,
            ]}
          >
            Places
          </Text>
        </TouchableOpacity>

        {/* Right Tab 2: Wallet & Invoices */}
        <TouchableOpacity
          onPress={() => onTabChange('wallet')}
          activeOpacity={0.8}
          style={styles.tabButton}
          accessibilityRole="tab"
          accessibilityLabel="Wallet and Passes"
        >
          <View
            style={[
              styles.iconCircle,
              activeTab === 'wallet' && styles.iconCircleActive,
            ]}
          >
            <Wallet
              size={20}
              color={activeTab === 'wallet' ? colors.dark : colors.textMuted}
              strokeWidth={activeTab === 'wallet' ? 2.4 : 1.8}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'wallet' && styles.tabLabelActive,
            ]}
          >
            Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.floating,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  iconCircleActive: {
    backgroundColor: colors.surfaceSubtle,
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.dark,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: colors.onDark,
    fontSize: 9,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.dark,
    fontWeight: '800',
  },
  centerFab: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginTop: -16,
  },
  fabInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadows.button,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
