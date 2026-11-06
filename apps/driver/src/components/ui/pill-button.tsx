import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/theme/theme';

export type PillButtonVariant = 'primary' | 'dark' | 'secondary' | 'outline';
export type PillButtonSize = 'sm' | 'md' | 'lg';

export interface PillButtonProps {
  title: string;
  onPress?: () => void;
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * PillButton
 * Neomorphic Continuous Capsule Button.
 * Supports 'dark' (charcoal call to action), 'primary' (mint accent),
 * 'secondary' (pure white elevated card surface), and 'outline' (hairline border).
 * Includes 60fps spring touch-down compression, activity loading spinner, and icon slots.
 */
export function PillButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  disabled = false,
  loading = false,
  isLoading = false,
  style,
  textStyle,
  accessibilityRole = 'button',
  accessibilityLabel,
  testID,
}: PillButtonProps) {
  const isBusy = loading || isLoading;
  const isDisabled = disabled || isBusy;
  const v = variants[variant];
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start();
  };

  const spinnerColor =
    variant === 'dark'
      ? theme.colors.onDark
      : variant === 'primary'
      ? theme.colors.onPrimary
      : theme.colors.textPrimary;

  return (
    <Pressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      style={style}
    >
      <Animated.View
        style={[
          styles.base,
          sizes[size],
          v.container,
          isDisabled && styles.disabled,
          { transform: [{ scale }] },
        ]}
      >
        {isBusy ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={spinnerColor} />
            <Text
              style={[
                styles.text,
                { color: v.color },
                size === 'sm' && styles.textSm,
                size === 'lg' && styles.textLg,
                styles.loadingText,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        ) : (
          <View style={styles.contentRow}>
            {icon && iconPosition === 'left' ? (
              <View style={styles.iconLeft}>{icon}</View>
            ) : null}
            <Text
              style={[
                styles.text,
                { color: v.color },
                size === 'sm' && styles.textSm,
                size === 'lg' && styles.textLg,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' ? (
              <View style={styles.iconRight}>{icon}</View>
            ) : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    ...theme.shadows.button,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    opacity: 0.9,
  },
  text: {
    fontSize: theme.sizes.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: theme.sizes.sm,
  },
  textLg: {
    fontSize: theme.sizes.md,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizes = StyleSheet.create({
  sm: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    minHeight: 48,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
  },
});

const variants = {
  primary: {
    container: {
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
    },
    color: theme.colors.onPrimary,
  },
  dark: {
    container: {
      backgroundColor: theme.colors.dark,
      borderWidth: 0,
    },
    color: theme.colors.onDark,
  },
  secondary: {
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1.5,
      ...theme.shadows.card,
    },
    color: theme.colors.textPrimary,
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
      borderWidth: 1.5,
    },
    color: theme.colors.textPrimary,
  },
} as const;

export default PillButton;
