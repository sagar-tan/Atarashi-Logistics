/**
 * b2b-gstin-modal.tsx
 * Modal for entering B2B GSTIN and Business Name for Atarashi Logistics.
 *
 * Implements:
 * - 15-character auto-capitalized GSTIN input with regex validation:
 *   ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
 * - Optional Legal Business Name
 * - Neomorphic styling with archive box icon, state code preview,
 *   informational benefit copy ("Get invoices with GSTIN to claim Input Tax Credit"),
 *   and continuous capsule Save CTA.
 */

import {
  AlertCircle,
  Archive,
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { PillButton } from '@/components/ui/pill-button';
import { theme } from '@/theme/theme';

const { colors, spacing, radius, shadows } = theme;
const WHITE = '#FFFFFF';

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '19': 'West Bengal',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export interface B2BGSTINModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (gstin: string, businessName: string) => void;
  currentGstin?: string;
  currentBusinessName?: string;
}

export function B2BGSTINModal({
  visible,
  onClose,
  onSave,
  currentGstin = '',
  currentBusinessName = '',
}: B2BGSTINModalProps) {
  const insets = useSafeAreaInsets();
  const [gstin, setGstin] = useState(currentGstin);
  const [businessName, setBusinessName] = useState(currentBusinessName);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (visible) {
      setGstin(currentGstin);
      setBusinessName(currentBusinessName);
      setTouched(false);
    }
  }, [visible, currentGstin, currentBusinessName]);

  const cleanGstin = gstin.trim().toUpperCase();
  const isValid = GSTIN_REGEX.test(cleanGstin);
  const isCompleteLength = cleanGstin.length === 15;

  const stateCode = cleanGstin.slice(0, 2);
  const stateName = INDIAN_STATE_CODES[stateCode];

  const handleGstinChange = (text: string) => {
    // Keep only alphanumeric characters and clamp to 15
    const sanitized = text.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setGstin(sanitized);
    if (!touched) setTouched(true);
  };

  const handleSave = () => {
    if (!isValid) return;
    Keyboard.dismiss();
    onSave(cleanGstin, businessName.trim());
    onClose();
  };

  const handleClear = () => {
    setGstin('');
    setBusinessName('');
    onSave('', '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconBox}>
              <Archive size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerSubtitle}>BUSINESS INVOICING</Text>
              <Text style={styles.headerTitle}>B2B GSTIN Details</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close GST modal"
            >
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Informational Benefit Card */}
            <View style={styles.benefitCard}>
              <View style={styles.benefitIconBox}>
                <ShieldCheck size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.benefitCopyCol}>
                <Text style={styles.benefitHeading}>Input Tax Credit (ITC) Eligible</Text>
                <Text style={styles.benefitBody}>
                  Get invoices with GSTIN to claim Input Tax Credit on logistics & parcel dispatch under Indian GST law.
                </Text>
              </View>
            </View>

            {/* GSTIN Input Tile */}
            <View style={styles.inputSection}>
              <Input
                label="GST Identification Number (GSTIN)"
                value={gstin}
                onChangeText={handleGstinChange}
                placeholder="e.g. 29AAAAA0000A1Z5"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={15}
                prefix={<Building2 size={18} color={colors.textMuted} />}
                suffix={
                  isCompleteLength ? (
                    isValid ? (
                      <CheckCircle2 size={18} color={colors.success} />
                    ) : (
                      <AlertCircle size={18} color={colors.error} />
                    )
                  ) : (
                    <Text style={styles.counterText}>{cleanGstin.length}/15</Text>
                  )
                }
                error={
                  touched && isCompleteLength && !isValid
                    ? 'Invalid GSTIN format. 14th character must be Z.'
                    : undefined
                }
                helperText={
                  isValid && stateName
                    ? `Registered State: ${stateName} (Code ${stateCode})`
                    : '15-character alphanumeric identifier (PAN based)'
                }
              />
            </View>

            {/* Business Legal Name Input */}
            <View style={styles.inputSection}>
              <Input
                label="Registered Business Name (Optional)"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Acme Logistics Technologies Pvt Ltd"
                autoCapitalize="words"
                prefix={<FileText size={18} color={colors.textMuted} />}
                helperText="Name printed on tax invoice for company reimbursement"
              />
            </View>

            {/* Validation Feedback Status Badge */}
            {cleanGstin.length > 0 && (
              <View
                style={[
                  styles.statusBadge,
                  isValid ? styles.statusBadgeSuccess : styles.statusBadgePending,
                ]}
              >
                {isValid ? (
                  <CheckCircle2 size={14} color={colors.primaryDark} />
                ) : (
                  <AlertCircle size={14} color="#D97706" />
                )}
                <Text
                  style={[
                    styles.statusBadgeText,
                    isValid ? styles.statusTextSuccess : styles.statusTextPending,
                  ]}
                >
                  {isValid
                    ? 'GSTIN Verified for B2B Tax Invoicing'
                    : `Enter all 15 characters according to standard format (${15 - cleanGstin.length} remaining)`}
                </Text>
              </View>
            )}

            {/* CTA Buttons */}
            <View style={styles.buttonStack}>
              <PillButton
                title="Save GSTIN Details"
                onPress={handleSave}
                disabled={!isValid}
                variant="primary"
                size="lg"
                style={styles.saveBtn}
              />

              {currentGstin.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearBtnText}>Remove GSTIN Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 19, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    backgroundColor: WHITE,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    gap: 12,
    ...shadows.card,
  },
  benefitIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopyCol: {
    flex: 1,
  },
  benefitHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  benefitBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  inputSection: {
    marginBottom: 14,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginBottom: 16,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  statusTextSuccess: {
    color: colors.primaryDark,
  },
  statusTextPending: {
    color: '#92400E',
  },
  buttonStack: {
    marginTop: 6,
    gap: 10,
  },
  saveBtn: {
    minHeight: 52,
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
});
