/**
 * TactileCard.tsx
 * Reusable Tactile Pressable Wrapper for Neomorphic Cards & Tiles.
 * Provides native 60fps spring micro-compression (scale: 0.982) on touch down
 * and snappy spring recovery on touch release without opacity fade.
 */

import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface TactileCardProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number; // Target scale down, default 0.982 (1.8% physical press)
  testID?: string;
  accessibilityRole?: 'button' | 'none';
  accessibilityLabel?: string;
}

export const TactileCard: React.FC<TactileCardProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  containerStyle,
  scaleTo = 0.982,
  testID,
  accessibilityRole = 'button',
  accessibilityLabel,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || (!onPress && !onLongPress)) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || (!onPress && !onLongPress)) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start();
  };

  if (!onPress && !onLongPress) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={containerStyle}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default TactileCard;
