/**
 * slide-to-confirm.tsx
 * Continuous Capsule Slide-to-Confirm Component for Atarashi Logistics.
 *
 * Implements a tactile slide-to-confirm pattern modeled after ride-hailing & Porter dispatch:
 * - Neomorphic light styling (chalk track #EDF2EE, border #E2E9E3, mint #6EE787 fill)
 * - 48px circular dark charcoal thumb (#111813) with vibrant mint arrow
 * - Centered high-contrast prompt typography that gracefully fades during drag
 * - Spring reset below 75% threshold, lock & confirmation at >= 75%
 * - Zero glassmorphism, continuous capsule geometry (borderRadius: 9999)
 */

import { Check, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { theme } from '@/theme/theme';

const { colors, radius, shadows } = theme;

const CONTAINER_HEIGHT = 56;
const THUMB_SIZE = 48;
const PADDING = 4;
const DEFAULT_TEXT = 'Slide to Confirm Booking';
const DEFAULT_CONFIRMED_TEXT = 'Booking Confirmed ✓';

export interface SlideToConfirmProps {
  onConfirm: () => void;
  text?: string;
  confirmedText?: string;
  disabled?: boolean;
  confirmed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SlideToConfirm({
  onConfirm,
  text = DEFAULT_TEXT,
  confirmedText = DEFAULT_CONFIRMED_TEXT,
  disabled = false,
  confirmed = false,
  style,
}: SlideToConfirmProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(confirmed);
  const maxDragRef = useRef(0);

  // Animated drag progress in pixels
  const pan = useRef(new Animated.Value(0)).current;

  // Arrow nudge animation to entice sliding
  const arrowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled || isConfirmed) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowPulse, {
          toValue: 4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(arrowPulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [disabled, isConfirmed]);

  // Handle external confirmed prop changes
  useEffect(() => {
    if (confirmed && !isConfirmed) {
      setIsConfirmed(true);
      if (maxDragRef.current > 0) {
        Animated.spring(pan, {
          toValue: maxDragRef.current,
          bounciness: 4,
          speed: 16,
          useNativeDriver: false,
        }).start();
      }
    } else if (!confirmed && isConfirmed) {
      setIsConfirmed(false);
      Animated.spring(pan, {
        toValue: 0,
        bounciness: 8,
        speed: 14,
        useNativeDriver: false,
      }).start();
    }
  }, [confirmed]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      const maxDrag = Math.max(0, width - THUMB_SIZE - PADDING * 2);
      maxDragRef.current = maxDrag;
      if (isConfirmed || confirmed) {
        pan.setValue(maxDrag);
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isConfirmed,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && !isConfirmed && Math.abs(gesture.dx) > 3,
      onPanResponderGrant: () => {
        pan.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        if (disabled || isConfirmed) return;
        const maxDrag = maxDragRef.current;
        const clampedX = Math.max(0, Math.min(gesture.dx, maxDrag));
        pan.setValue(clampedX);
      },
      onPanResponderRelease: (_, gesture) => {
        if (disabled || isConfirmed) return;
        const maxDrag = maxDragRef.current;
        const threshold = maxDrag * 0.75;

        if (gesture.dx >= threshold) {
          // Slide completed! Lock and trigger onConfirm
          setIsConfirmed(true);
          Animated.spring(pan, {
            toValue: maxDrag,
            bounciness: 4,
            speed: 16,
            useNativeDriver: false,
          }).start(() => {
            onConfirm();
          });
        } else {
          // Snap back with smooth spring
          Animated.spring(pan, {
            toValue: 0,
            bounciness: 8,
            speed: 14,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isConfirmed) {
          Animated.spring(pan, {
            toValue: 0,
            bounciness: 8,
            speed: 14,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const maxDrag = maxDragRef.current || 1;

  // Track fill width expands as thumb slides right
  const trackWidth = pan.interpolate({
    inputRange: [0, maxDrag],
    outputRange: [THUMB_SIZE + PADDING * 2, containerWidth || THUMB_SIZE + PADDING * 2],
    extrapolate: 'clamp',
  });

  // Prompt label fades out as slider passes 45% of travel
  const textOpacity = pan.interpolate({
    inputRange: [0, maxDrag * 0.45],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Confirmed text fades in once locked
  const confirmedTextOpacity = pan.interpolate({
    inputRange: [maxDrag * 0.75, maxDrag],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.container,
        disabled && styles.containerDisabled,
        style,
      ]}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={isConfirmed ? confirmedText : text}
      accessibilityState={{ disabled }}
    >
      {/* Dynamic Mint Green Progress Track */}
      <Animated.View
        style={[
          styles.progressTrack,
          {
            width: trackWidth,
          },
        ]}
      />

      {/* Centered Slide Prompt Label */}
      {!isConfirmed && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.textWrapper,
            {
              opacity: textOpacity,
            },
          ]}
        >
          <Text style={styles.promptText}>
            {text} <Text style={styles.chevronCues}>›››</Text>
          </Text>
        </Animated.View>
      )}

      {/* Confirmed State Label */}
      {isConfirmed && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.textWrapper,
            {
              opacity: confirmedTextOpacity,
            },
          ]}
        >
          <Text style={styles.confirmedText}>{confirmedText}</Text>
        </Animated.View>
      )}

      {/* Draggable Neomorphic Charcoal Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          isConfirmed && styles.thumbConfirmed,
          {
            transform: [{ translateX: pan }],
          },
        ]}
      >
        {isConfirmed ? (
          <Check size={22} color={colors.onDark} strokeWidth={3} />
        ) : (
          <Animated.View
            style={{
              transform: [{ translateX: arrowPulse }],
            }}
          >
            <ChevronRight size={22} color={colors.onDark} strokeWidth={2.8} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: PADDING,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  containerDisabled: {
    opacity: 0.55,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.surfacePressed,
    borderRadius: radius.pill,
  },
  textWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: THUMB_SIZE + PADDING * 2,
    paddingRight: PADDING * 2,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  chevronCues: {
    color: colors.primaryDark,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  confirmedText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 0.4,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  thumbConfirmed: {
    backgroundColor: colors.primaryDark,
  },
});
