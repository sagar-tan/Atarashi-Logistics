import React from 'react';
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/theme/theme';
import { TactileCard } from './tactile-card';

export type NeomorphCardVariant = 'elevated' | 'flat' | 'pressed' | 'mint';

export interface NeomorphCardProps {
  children: React.ReactNode;
  variant?: NeomorphCardVariant;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * NeomorphCard
 * Soft extruded surface with neomorphic shadows.
 * Wraps TactileCard for 60fps spring micro-compression (scale: 0.982) when onPress is passed.
 */
export function NeomorphCard({
  children,
  variant = 'elevated',
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.982,
  style,
  containerStyle,
  accessibilityLabel,
  testID,
}: NeomorphCardProps) {
  const cardStyle = [styles.base, variantStyles[variant], style];

  if (!onPress && !onLongPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <TactileCard
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      scaleTo={scaleTo}
      style={cardStyle}
      containerStyle={containerStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </TactileCard>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
  },
});

const variantStyles = StyleSheet.create({
  elevated: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  flat: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  mint: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
    borderWidth: 1,
    ...theme.shadows.card,
  },
});

export default NeomorphCard;
