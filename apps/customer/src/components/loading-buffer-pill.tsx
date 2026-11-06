/**
 * loading-buffer-pill.tsx
 * Transparent Loading Buffer & Operational Policy Card for Atarashi Logistics.
 * Modeled on Porter's logistics dispatch policy specifications.
 *
 * Strict Neomorphic Light Mode Design:
 * - Canvas: Chalk (#F4F7F4)
 * - Surfaces: Elevated pure white (#FFFFFF) with dual soft shadows
 * - Accents: Vibrant light mint green (#6EE787 / #5EDB79), warning amber, rich charcoal (#111813)
 * - Geometry: Continuous capsule pill buttons (borderRadius: 9999)
 * - Zero glassmorphism
 * - Financial Invariant: Monetary values strictly in integer PAISE (100 paise = ₹1.00)
 */

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { NeomorphCard } from '@/components/ui/neomorph-card';
import { PillButton } from '@/components/ui/pill-button';
import { theme } from '@/theme/theme';

const { colors, spacing, radius, shadows, sizes } = theme;

export interface LoadingBufferPillProps {
  /**
   * Included free loading and unloading minutes before overage kicks in.
   * Default: 25 minutes.
   */
  freeMinutes?: number;

  /**
   * Overage rate in integer PAISE per minute (100 paise = ₹1.00).
   * Default: 200 paise/min (₹2.0/min).
   */
  overageRatePaise?: number;

  /**
   * Whether road & highway tolls are included in the quote.
   * Default: true.
   */
  tollIncluded?: boolean;

  /**
   * Customer parking notice.
   * Default: "Parking charges to be paid by customer".
   */
  parkingNotice?: string;

  /**
   * Safety notice regarding prohibited goods.
   */
  safetyNotice?: string;

  /**
   * Presentation variant:
   * - 'card': Full transparent logistics policy card with 3 sections.
   * - 'pill': Compact capsule summary pill for bottom sheets or review cards.
   * - 'banner': Single-row highlighted policy strip.
   */
  variant?: 'card' | 'pill' | 'banner';

  /**
   * Whether card is compact (e.g. within quick summary views).
   */
  compact?: boolean;

  /**
   * Custom container style.
   */
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;

  /**
   * Callback when user taps learn more / details.
   */
  onPressDetails?: () => void;
}

export function LoadingBufferPill({
  freeMinutes = 25,
  overageRatePaise = 200,
  tollIncluded = true,
  parkingNotice = 'Parking charges to be paid by customer',
  safetyNotice = 'Do not send restricted or illegal items (explosives, flammables, narcotics)',
  variant = 'card',
  compact = false,
  style,
  containerStyle,
  onPressDetails,
}: LoadingBufferPillProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Convert integer paise to rupee string (e.g. 200 -> "2.0")
  const overageRupeesString = (overageRatePaise / 100).toFixed(1);

  const policyText = `Free ${freeMinutes} mins of loading-unloading time included (₹${overageRupeesString}/min overage rate)`;
  const fareTermsText = `${
    tollIncluded ? 'Toll included in fare' : 'Toll charged separately'
  } • ${parkingNotice}`;

  const handleOpenDetails = () => {
    if (onPressDetails) {
      onPressDetails();
    } else {
      setModalVisible(true);
    }
  };

  // ==========================================================
  // Render: Compact Capsule Summary Pill
  // ==========================================================
  if (variant === 'pill') {
    return (
      <View style={[styles.pillWrapper, containerStyle]}>
        <TouchableOpacity
          style={[styles.compactPillContainer, style]}
          onPress={handleOpenDetails}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={policyText}
        >
          <View style={styles.pillIconBubble}>
            <Clock size={12} color={colors.primaryDark} strokeWidth={2.4} />
          </View>
          <Text style={styles.compactPillText} numberOfLines={1}>
            {freeMinutes}m Free Loading • ₹{overageRupeesString}/m extra
          </Text>
          <ChevronRight size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================================
  // Render: Single-Row Policy Banner Strip
  // ==========================================================
  if (variant === 'banner') {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        <TouchableOpacity
          style={[styles.bannerContainer, style]}
          onPress={handleOpenDetails}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={policyText}
        >
          <View style={styles.bannerIconCircle}>
            <Clock size={15} color={colors.primaryDark} strokeWidth={2.4} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{policyText}</Text>
            <Text style={styles.bannerSub}>{fareTermsText}</Text>
          </View>
          <ChevronRight size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================================
  // Render: Standard Neomorphic Policy Card (Default)
  // ==========================================================
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <NeomorphCard style={[styles.card, style]}>
        {/* Section 1: Loading & Unloading Buffer Policy Banner */}
        <View style={styles.policyBannerRow}>
          <View style={styles.clockIconCircle}>
            <Clock size={18} color={colors.primaryDark} strokeWidth={2.5} />
          </View>
          <View style={styles.policyBannerContent}>
            <View style={styles.bannerHeaderRow}>
              <Text style={styles.policyTitle}>LOADING & UNLOADING BUFFER</Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE INCLUDED</Text>
              </View>
            </View>
            <Text style={styles.policyTextHighlight}>{policyText}</Text>
            {!compact && (
              <Text style={styles.policySubtext}>
                Begins automatically when driver arrives at pickup & drops. Extra
                loading duration settled transparently at driver checkout.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 2: Safety & Prohibited Items Disclaimer */}
        <View style={styles.safetyRow}>
          <View style={styles.alertIconCircle}>
            <AlertTriangle size={17} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.safetyContent}>
            <View style={styles.safetyHeaderRow}>
              <Text style={styles.safetyTitle}>SAFETY COMPLIANCE</Text>
              <View style={styles.restrictedBadge}>
                <Text style={styles.restrictedBadgeText}>PROHIBITED CARGO</Text>
              </View>
            </View>
            <Text style={styles.safetyMessageText}>{safetyNotice}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 3: Fare Terms & Toll Summary */}
        <View style={styles.fareTermsRow}>
          <View style={styles.shieldIconCircle}>
            <ShieldCheck size={17} color={colors.primaryDark} strokeWidth={2.4} />
          </View>
          <View style={styles.fareTermsContent}>
            <Text style={styles.fareTermsHeader}>TRANSPARENT FARE TERMS</Text>
            <Text style={styles.fareTermsText}>{fareTermsText}</Text>
            {!compact && (
              <Text style={styles.fareTermsSub}>
                Electronic expressway tolls are included. Driver will share physical
                receipts for mall, tech park, or society parking charges.
              </Text>
            )}
          </View>
        </View>

        {/* View Full Terms Footer Action */}
        <TouchableOpacity
          style={styles.detailsActionRow}
          onPress={handleOpenDetails}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="View comprehensive logistics policies"
        >
          <View style={styles.detailsActionLeft}>
            <Info size={13} color={colors.primaryDark} />
            <Text style={styles.detailsActionText}>
              View Logistics Terms & Prohibited List
            </Text>
          </View>
          <ChevronRight size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </NeomorphCard>

      {/* ========================================================== */}
      {/* Policy Details Bottom Sheet Modal                          */}
      {/* ========================================================== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Logistics Policies & Terms</Text>
                <Text style={styles.modalSubtitle}>
                  Transparent dispatch standards for Atarashi Logistics
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close policy dialog"
              >
                <X size={18} color={colors.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              {/* Policy 1: Loading & Unloading Buffer */}
              <View style={styles.modalPolicyItem}>
                <View style={styles.modalPolicyHeader}>
                  <View style={styles.clockIconCircle}>
                    <Clock size={16} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.modalPolicyTitle}>
                    Loading & Unloading Buffer
                  </Text>
                </View>
                <Text style={styles.modalPolicyBody}>
                  Every booking comes with {freeMinutes} complimentary minutes of
                  loading and unloading time divided between pickup and dropoff
                  stops.
                </Text>
                <View style={styles.modalHighlightTile}>
                  <Text style={styles.modalHighlightTileText}>
                    • 0 to {freeMinutes} minutes: ₹0 (Included in Base Fare)
                    {'\n'}• Beyond {freeMinutes} minutes: ₹{overageRupeesString}/min
                    ({overageRatePaise} paise/min)
                  </Text>
                </View>
                <Text style={styles.modalPolicySub}>
                  The driver taps "Arrived" upon reaching the pin location, and the
                  timer starts after a 5-minute grace window.
                </Text>
              </View>

              {/* Policy 2: Safety & Prohibited Items */}
              <View style={styles.modalPolicyItem}>
                <View style={styles.modalPolicyHeader}>
                  <View style={styles.alertIconCircle}>
                    <AlertTriangle size={16} color="#D97706" />
                  </View>
                  <Text style={styles.modalPolicyTitle}>
                    Restricted & Prohibited Goods
                  </Text>
                </View>
                <Text style={styles.modalPolicyBody}>
                  {safetyNotice}
                </Text>
                <View style={styles.prohibitedList}>
                  <Text style={styles.prohibitedItem}>
                    🚫 Explosives, fireworks, or radioactive elements
                  </Text>
                  <Text style={styles.prohibitedItem}>
                    🚫 Highly flammable fuels, gases, or concentrated acids
                  </Text>
                  <Text style={styles.prohibitedItem}>
                    🚫 Narcotics, illegal psychotropics, and contraband
                  </Text>
                  <Text style={styles.prohibitedItem}>
                    🚫 Unlicensed firearms, ammunition, or sharp weapons
                  </Text>
                  <Text style={styles.prohibitedItem}>
                    🚫 Unaccompanied currency notes, bullion, or live pets
                  </Text>
                </View>
                <Text style={styles.modalPolicySub}>
                  Couriers have legal authorization to refuse suspicious parcels and
                  escalate to police or RPF authorities immediately.
                </Text>
              </View>

              {/* Policy 3: Tolls & Parking */}
              <View style={styles.modalPolicyItem}>
                <View style={styles.modalPolicyHeader}>
                  <View style={styles.shieldIconCircle}>
                    <ShieldCheck size={16} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.modalPolicyTitle}>Tolls & Parking Charges</Text>
                </View>
                <Text style={styles.modalPolicyBody}>
                  {tollIncluded
                    ? 'All standard expressway Fastag tolls are calculated and included in the total booking estimate.'
                    : 'Tolls on expressways are calculated dynamically upon completion.'}
                </Text>
                <Text style={styles.modalPolicyBody}>
                  Physical parking tickets, gated community access fees, or tech
                  park entry receipts must be reimbursed to the courier directly in
                  cash or UPI upon presenting the physical receipt.
                </Text>
              </View>

              <PillButton
                title="Understood & Agree"
                variant="dark"
                size="md"
                onPress={() => setModalVisible(false)}
                icon={<CheckCircle2 size={16} color={colors.onDark} />}
                style={styles.modalAgreeButton}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // Section 1: Policy Banner
  policyBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  clockIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  policyBannerContent: {
    flex: 1,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  policyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.6,
  },
  freeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.4,
  },
  policyTextHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 18,
  },
  policySubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
  },

  // Section 2: Safety Disclaimer
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 2,
  },
  safetyContent: {
    flex: 1,
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  restrictedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  restrictedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  safetyMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
    lineHeight: 17,
  },

  // Section 3: Fare Terms
  fareTermsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  shieldIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  fareTermsContent: {
    flex: 1,
  },
  fareTermsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  fareTermsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 17,
  },
  fareTermsSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
  },

  // Details Action Row
  detailsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  detailsActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  // Variant: Pill
  pillWrapper: {
    alignSelf: 'flex-start',
  },
  compactPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    ...shadows.card,
  },
  pillIconBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark,
  },

  // Variant: Banner
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.card,
  },
  bannerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark,
  },
  bannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 19, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  modalPolicyItem: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalPolicyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalPolicyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark,
  },
  modalPolicyBody: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  modalHighlightTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 4,
  },
  modalHighlightTileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    lineHeight: 18,
  },
  modalPolicySub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 4,
  },
  prohibitedList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    marginVertical: 4,
  },
  prohibitedItem: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark,
    lineHeight: 16,
  },
  modalAgreeButton: {
    marginTop: spacing.sm,
  },
});

export default LoadingBufferPill;
