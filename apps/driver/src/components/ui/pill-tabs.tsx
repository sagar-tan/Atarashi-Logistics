/**
 * PillTabs.tsx
 * Segmented Tab Capsule Switcher with Smooth Sliding Indicator.
 * Neomorphic tactile styling with spring physics.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { theme } from '@/theme/theme';

export interface PillTabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface PillTabsProps<T extends string> {
  tabs: PillTabItem<T>[];
  activeTab: T;
  onTabChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function PillTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  style,
}: PillTabsProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeTab));
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, slideAnim]);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const tabWidth =
    containerWidth > 8 && tabs.length > 0 ? (containerWidth - 8) / tabs.length : 0;

  const translateX =
    tabs.length > 1 && tabWidth > 0
      ? slideAnim.interpolate({
          inputRange: tabs.map((_, i) => i),
          outputRange: tabs.map((_, i) => i * tabWidth),
        })
      : 0;

  return (
    <View style={[styles.container, style]} onLayout={onContainerLayout}>
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.8}
            onPress={() => onTabChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon ? <View style={styles.tabIcon}>{tab.icon}</View> : null}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {typeof tab.count === 'number' && (
              <View
                style={[
                  styles.countBadge,
                  isActive && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive && styles.countTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.pill,
    padding: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    ...theme.shadows.card,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    gap: 6,
    zIndex: 2,
  },
  tabIcon: {
    marginRight: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.dark,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  countBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  countTextActive: {
    color: theme.colors.dark,
  },
});

export default PillTabs;
