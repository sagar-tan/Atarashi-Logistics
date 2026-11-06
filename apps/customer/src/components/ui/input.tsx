import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { theme } from '@/theme/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Input
 * Neomorphic Inset Input Tile.
 * Features tactile inset styling, subtle hairline borders, and an active mint focus ring.
 */
export const Input: React.FC<InputProps> = ({
  label,
  prefix,
  suffix,
  error,
  helperText,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputGroup,
          isFocused && styles.inputGroupFocused,
          error ? styles.inputGroupError : null,
          inputContainerStyle,
        ]}
      >
        {prefix && <View style={styles.prefixContainer}>{prefix}</View>}
        <TextInput
          style={[styles.input, inputStyle, style]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={theme.colors.dark}
          {...rest}
        />
        {suffix && <View style={styles.suffixContainer}>{suffix}</View>}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    ...theme.shadows.button,
  },
  inputGroupFocused: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  inputGroupError: {
    borderColor: theme.colors.error,
  },
  prefixContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suffixContainer: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 4,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 4,
  },
});

export default Input;
