/**
 * multi-stop-route-card.tsx
 * Multi-Stop Route Management & Sender/Receiver Contact Card for Atarashi Logistics.
 * Modeled on Porter's multi-stop logistics dispatch UX.
 *
 * Adheres strictly to Neomorphic Light Mode design system:
 * - Canvas: Chalk (#F4F7F4)
 * - Elevated pure white surfaces (#FFFFFF) with dual soft drop-shadows
 * - Vibrant light mint green (#6EE787 / #5EDB79) accents
 * - High-contrast rich charcoal (#111813)
 * - Continuous capsule pill buttons (borderRadius: 9999)
 * - ZERO glassmorphism
 */

import type { Coordinates } from '@atarashi/domain';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Check,
  Clock,
  Crosshair,
  Edit3,
  Home,
  MapPin,
  Phone,
  Plus,
  Store,
  User,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
import Svg, { Circle, Line } from 'react-native-svg';

import { Input } from '@/components/ui/input';
import { NeomorphCard } from '@/components/ui/neomorph-card';
import { PillButton } from '@/components/ui/pill-button';
import { theme } from '@/theme/theme';

const { colors, spacing, radius, shadows, sizes } = theme;

export type AddressTag = 'Home' | 'Shop' | 'Other';

export interface StopContact {
  name: string;
  phone: string;
  houseDetails?: string; // House / Flat / Floor / Building / Landmark
  tag?: AddressTag;
  useMyNumber?: boolean;
}

export interface RouteStop {
  id: string;
  address: string;
  coordinates?: Coordinates;
  contact: StopContact;
}

export interface MultiStopRouteCardProps {
  pickup: RouteStop;
  drops: RouteStop[];
  maxDrops?: number; // Default 2 stops
  userPhone?: string; // Current authenticated user's mobile number
  userName?: string; // Current authenticated user's name
  distanceKm?: number;
  travelMins?: number;
  onReverseRoute?: () => void;
  onAddStop?: () => void;
  onRemoveStop?: (dropIndex: number) => void;
  onEditLocation?: (target: 'pickup' | { dropIndex: number }) => void;
  onUpdatePickupContact?: (contact: StopContact) => void;
  onUpdateDropContact?: (dropIndex: number, contact: StopContact) => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  editable?: boolean;
}

type EditTarget = 'pickup' | { dropIndex: number };

export function MultiStopRouteCard({
  pickup,
  drops,
  maxDrops = 2,
  userPhone = '+91 98765 43210',
  userName = 'Rahul Verma',
  distanceKm,
  travelMins,
  onReverseRoute,
  onAddStop,
  onRemoveStop,
  onEditLocation,
  onUpdatePickupContact,
  onUpdateDropContact,
  style,
  containerStyle,
  editable = true,
}: MultiStopRouteCardProps) {
  // Modal state for editing contact details
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>('pickup');

  // Form states inside modal
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formHouse, setFormHouse] = useState('');
  const [formTag, setFormTag] = useState<AddressTag>('Home');
  const [formUseMyNumber, setFormUseMyNumber] = useState(false);

  const canAddStop = drops.length < maxDrops;

  const openContactEditor = (target: EditTarget) => {
    setEditTarget(target);
    const contact =
      target === 'pickup'
        ? pickup.contact
        : drops[target.dropIndex]?.contact || {
            name: '',
            phone: '',
            houseDetails: '',
            tag: 'Shop',
          };

    setFormName(contact.name || '');
    setFormPhone(contact.phone || '');
    setFormHouse(contact.houseDetails || '');
    setFormTag(contact.tag || (target === 'pickup' ? 'Home' : 'Shop'));
    setFormUseMyNumber(Boolean(contact.useMyNumber));
    setModalVisible(true);
  };

  const handleToggleUseMyNumber = () => {
    const nextState = !formUseMyNumber;
    setFormUseMyNumber(nextState);
    if (nextState) {
      if (userPhone) setFormPhone(userPhone);
      if (userName && !formName) setFormName(userName);
    }
  };

  const handleSaveContact = () => {
    const updatedContact: StopContact = {
      name: formName.trim() || (editTarget === 'pickup' ? 'Sender' : 'Receiver'),
      phone: formPhone.trim() || userPhone,
      houseDetails: formHouse.trim(),
      tag: formTag,
      useMyNumber: formUseMyNumber,
    };

    if (editTarget === 'pickup') {
      onUpdatePickupContact?.(updatedContact);
    } else {
      onUpdateDropContact?.(editTarget.dropIndex, updatedContact);
    }

    setModalVisible(false);
  };

  // Helper to render address tag badge
  const renderTagChip = (tag?: AddressTag) => {
    const activeTag = tag || 'Home';
    return (
      <View style={styles.tagChip}>
        {activeTag === 'Home' && <Home size={10} color={colors.primaryDark} />}
        {activeTag === 'Shop' && <Store size={10} color={colors.primaryDark} />}
        {activeTag === 'Other' && <MapPin size={10} color={colors.primaryDark} />}
        <Text style={styles.tagChipText}>{activeTag}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <NeomorphCard style={[styles.card, style]}>
        {/* Header Row: Title, Stop Badges & Route Reversal Button */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>DELIVERY ROUTE</Text>
            <View style={styles.stopBadge}>
              <Text style={styles.stopBadgeText}>
                1 Pickup • {drops.length} {drops.length === 1 ? 'Drop' : 'Drops'}
              </Text>
            </View>
          </View>

          {onReverseRoute && editable && (
            <TouchableOpacity
              style={styles.reverseButton}
              onPress={onReverseRoute}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Reverse pickup and first delivery stop"
            >
              <ArrowUpDown size={14} color={colors.primaryDark} strokeWidth={2.4} />
              <Text style={styles.reverseButtonText}>Reverse</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Route Stops Container */}
        <View style={styles.routeBody}>
          {/* ======================================================== */}
          {/* 1. PICKUP STOP                                           */}
          {/* ======================================================== */}
          <View style={styles.stopItem}>
            {/* Left Column: Visual Icon & Vertical Connector */}
            <View style={styles.iconColumn}>
              <View style={styles.pickupCircle}>
                <ArrowUp size={13} color={colors.onDark} strokeWidth={2.8} />
              </View>

              {/* Dotted Vertical Line Connector */}
              <View style={styles.dottedConnectorContainer}>
                <Svg height="100%" width="12" viewBox="0 0 12 60">
                  <Line
                    x1="6"
                    y1="2"
                    x2="6"
                    y2="58"
                    stroke={colors.border}
                    strokeWidth="2.2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            </View>

            {/* Right Column: Address and Sender Details */}
            <View style={styles.stopContent}>
              <View style={styles.stopTopRow}>
                <View style={styles.stopLabelGroup}>
                  <Text style={styles.stopLabelPickup}>PICKUP POINT</Text>
                  {renderTagChip(pickup.contact.tag)}
                </View>

                {editable && (
                  <View style={styles.actionsGroup}>
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => onEditLocation?.('pickup')}
                      activeOpacity={0.7}
                      accessibilityLabel="Change pickup location on map"
                    >
                      <Crosshair size={11} color={colors.primaryDark} />
                      <Text style={styles.actionChipText}>Pinpoint</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => openContactEditor('pickup')}
                      activeOpacity={0.7}
                      accessibilityLabel="Edit sender contact details"
                    >
                      <Edit3 size={11} color={colors.textSecondary} />
                      <Text style={styles.actionChipTextSecondary}>Contact</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Address Summary */}
              <TouchableOpacity
                activeOpacity={editable ? 0.7 : 1}
                onPress={editable ? () => onEditLocation?.('pickup') : undefined}
                style={styles.addressTouchable}
              >
                <Text style={styles.addressMain} numberOfLines={2}>
                  {pickup.address || 'Select Pickup Location'}
                </Text>
                {pickup.contact.houseDetails ? (
                  <Text style={styles.houseDetailsText} numberOfLines={1}>
                    {pickup.contact.houseDetails}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {/* Sender Contact Summary */}
              <TouchableOpacity
                style={styles.contactRow}
                activeOpacity={0.7}
                onPress={() => openContactEditor('pickup')}
              >
                <View style={styles.contactPill}>
                  <User size={11} color={colors.textSecondary} />
                  <Text style={styles.contactName} numberOfLines={1}>
                    {pickup.contact.name || 'Rahul Verma'}
                  </Text>
                </View>
                <View style={styles.contactPill}>
                  <Phone size={11} color={colors.textSecondary} />
                  <Text style={styles.contactPhone}>
                    {pickup.contact.phone || userPhone}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 2. DROP STOPS (1 or 2 Stops)                             */}
          {/* ======================================================== */}
          {drops.map((drop, index) => {
            const isLastDrop = index === drops.length - 1;
            const dropTitle =
              drops.length === 1
                ? 'DELIVERY DESTINATION'
                : `DROP STOP ${index + 1}${isLastDrop ? ' (FINAL)' : ''}`;

            return (
              <View key={drop.id || `drop-${index}`} style={styles.stopItem}>
                {/* Left Column: Visual Icon & Vertical Connector */}
                <View style={styles.iconColumn}>
                  <View style={styles.dropCircle}>
                    <ArrowDown size={13} color={colors.onDark} strokeWidth={2.8} />
                  </View>

                  {/* Connect to next drop if exists */}
                  {!isLastDrop ? (
                    <View style={styles.dottedConnectorContainer}>
                      <Svg height="100%" width="12" viewBox="0 0 12 60">
                        <Line
                          x1="6"
                          y1="2"
                          x2="6"
                          y2="58"
                          stroke={colors.border}
                          strokeWidth="2.2"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                        />
                      </Svg>
                    </View>
                  ) : (
                    <View style={styles.connectorSpacer} />
                  )}
                </View>

                {/* Right Column: Address and Receiver Details */}
                <View style={styles.stopContent}>
                  <View style={styles.stopTopRow}>
                    <View style={styles.stopLabelGroup}>
                      <Text style={styles.stopLabelDrop}>{dropTitle}</Text>
                      {renderTagChip(drop.contact.tag || 'Shop')}
                    </View>

                    <View style={styles.actionsGroup}>
                      {editable && (
                        <>
                          <TouchableOpacity
                            style={styles.actionChip}
                            onPress={() => onEditLocation?.({ dropIndex: index })}
                            activeOpacity={0.7}
                            accessibilityLabel={`Change drop ${index + 1} location on map`}
                          >
                            <Crosshair size={11} color={colors.primaryDark} />
                            <Text style={styles.actionChipText}>Pinpoint</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionChip}
                            onPress={() => openContactEditor({ dropIndex: index })}
                            activeOpacity={0.7}
                            accessibilityLabel={`Edit receiver ${index + 1} contact details`}
                          >
                            <Edit3 size={11} color={colors.textSecondary} />
                            <Text style={styles.actionChipTextSecondary}>Contact</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Remove Stop Button (if more than 1 drop stop) */}
                      {editable && drops.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeStopButton}
                          onPress={() => onRemoveStop?.(index)}
                          activeOpacity={0.7}
                          accessibilityLabel={`Remove stop ${index + 1}`}
                        >
                          <X size={12} color={colors.error} strokeWidth={2.6} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Address Summary */}
                  <TouchableOpacity
                    activeOpacity={editable ? 0.7 : 1}
                    onPress={
                      editable
                        ? () => onEditLocation?.({ dropIndex: index })
                        : undefined
                    }
                    style={styles.addressTouchable}
                  >
                    <Text style={styles.addressMain} numberOfLines={2}>
                      {drop.address || 'Select Drop Location'}
                    </Text>
                    {drop.contact.houseDetails ? (
                      <Text style={styles.houseDetailsText} numberOfLines={1}>
                        {drop.contact.houseDetails}
                      </Text>
                    ) : null}
                  </TouchableOpacity>

                  {/* Receiver Contact Summary */}
                  <TouchableOpacity
                    style={styles.contactRow}
                    activeOpacity={0.7}
                    onPress={() => openContactEditor({ dropIndex: index })}
                  >
                    <View style={styles.contactPill}>
                      <User size={11} color={colors.textSecondary} />
                      <Text style={styles.contactName} numberOfLines={1}>
                        {drop.contact.name || 'Priya Patel'}
                      </Text>
                    </View>
                    <View style={styles.contactPill}>
                      <Phone size={11} color={colors.textSecondary} />
                      <Text style={styles.contactPhone}>
                        {drop.contact.phone || '+91 98123 45678'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ======================================================== */}
        {/* + ADD STOP BUTTON (Allows up to 2 drop stops)             */}
        {/* ======================================================== */}
        {editable && canAddStop && onAddStop && (
          <View style={styles.addStopSection}>
            <TouchableOpacity
              style={styles.addStopButton}
              onPress={onAddStop}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add another drop stop for batch delivery"
            >
              <View style={styles.addStopIconCircle}>
                <Plus size={14} color={colors.primaryDark} strokeWidth={2.8} />
              </View>
              <View style={styles.addStopTextContainer}>
                <Text style={styles.addStopTitle}>+ Add Stop</Text>
                <Text style={styles.addStopSubtitle}>
                  Batch deliveries on same route (Max {maxDrops} drops)
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Route Metrics Row (Distance & Travel Time) */}
        {(distanceKm !== undefined || travelMins !== undefined) && (
          <View style={styles.metricsFooter}>
            {distanceKm !== undefined && (
              <View style={styles.metricItem}>
                <MapPin size={12} color={colors.primaryDark} />
                <Text style={styles.metricText}>{distanceKm} km total route</Text>
              </View>
            )}
            {travelMins !== undefined && (
              <View style={styles.metricItem}>
                <Clock size={12} color={colors.primaryDark} />
                <Text style={styles.metricText}>~{travelMins} mins travel time</Text>
              </View>
            )}
          </View>
        )}
      </NeomorphCard>

      {/* ======================================================== */}
      {/* CONTACT FIELDS EXPANSION MODAL                           */}
      {/* ======================================================== */}
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
                <Text style={styles.modalTitle}>
                  {editTarget === 'pickup'
                    ? 'Sender Contact Details'
                    : `Receiver Details (Drop ${
                        typeof editTarget === 'object'
                          ? editTarget.dropIndex + 1
                          : 1
                      })`}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Driver calls this number upon arrival
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close contact editor"
              >
                <X size={18} color={colors.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* "Use my mobile number" Toggle Chip */}
              <TouchableOpacity
                style={[
                  styles.useMyNumberToggle,
                  formUseMyNumber && styles.useMyNumberToggleActive,
                ]}
                onPress={handleToggleUseMyNumber}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxCircle,
                    formUseMyNumber && styles.checkboxCircleActive,
                  ]}
                >
                  {formUseMyNumber && (
                    <Check size={12} color={colors.onPrimary} strokeWidth={3} />
                  )}
                </View>
                <View style={styles.useMyNumberTextGroup}>
                  <Text style={styles.useMyNumberTitle}>Use my mobile number</Text>
                  <Text style={styles.useMyNumberSub}>
                    Prefill with account phone ({userPhone})
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Full Name Input */}
              <Input
                label="Full Name"
                placeholder={
                  editTarget === 'pickup' ? 'e.g. Rahul Verma' : 'e.g. Priya Patel'
                }
                value={formName}
                onChangeText={setFormName}
                prefix={<User size={16} color={colors.textSecondary} />}
                autoCapitalize="words"
              />

              {/* Mobile Number Input */}
              <Input
                label="Contact Mobile Number"
                placeholder="+91 98000 00000"
                value={formPhone}
                onChangeText={setFormPhone}
                prefix={<Phone size={16} color={colors.textSecondary} />}
                keyboardType="phone-pad"
              />

              {/* Address Tags Selector */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>ADDRESS TAG</Text>
                <View style={styles.tagSelectorRow}>
                  {(['Home', 'Shop', 'Other'] as AddressTag[]).map((tagOption) => {
                    const isSelected = formTag === tagOption;
                    return (
                      <TouchableOpacity
                        key={tagOption}
                        style={[
                          styles.tagOptionPill,
                          isSelected && styles.tagOptionPillSelected,
                        ]}
                        onPress={() => setFormTag(tagOption)}
                        activeOpacity={0.75}
                      >
                        {tagOption === 'Home' && (
                          <Home
                            size={14}
                            color={isSelected ? colors.dark : colors.textSecondary}
                          />
                        )}
                        {tagOption === 'Shop' && (
                          <Store
                            size={14}
                            color={isSelected ? colors.dark : colors.textSecondary}
                          />
                        )}
                        {tagOption === 'Other' && (
                          <MapPin
                            size={14}
                            color={isSelected ? colors.dark : colors.textSecondary}
                          />
                        )}
                        <Text
                          style={[
                            styles.tagOptionText,
                            isSelected && styles.tagOptionTextSelected,
                          ]}
                        >
                          {tagOption}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* House / Floor / Apartment Info */}
              <Input
                label="House / Floor / Apartment / Landmark"
                placeholder="e.g. Flat 402, 4th Floor, Green Glen Heights"
                value={formHouse}
                onChangeText={setFormHouse}
                prefix={<Building2 size={16} color={colors.textSecondary} />}
                helperText="Helps the courier reach your doorstep faster"
              />

              {/* Save Button */}
              <View style={styles.modalActions}>
                <PillButton
                  title="Save Contact Details"
                  variant="dark"
                  size="md"
                  onPress={handleSaveContact}
                  icon={<Check size={16} color={colors.onDark} />}
                />
              </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  stopBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reverseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reverseButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  // Route Body & Stop Items
  routeBody: {
    gap: 0,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconColumn: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
    paddingTop: 2,
  },
  pickupCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  dropCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  dottedConnectorContainer: {
    width: 12,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  connectorSpacer: {
    height: 8,
  },

  stopContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  stopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stopLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopLabelPickup: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  stopLabelDrop: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  actionChipTextSecondary: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  removeStopButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  addressTouchable: {
    marginBottom: 4,
  },
  addressMain: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 19,
  },
  houseDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: 120,
  },
  contactPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // + Add Stop Button
  addStopSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 10,
  },
  addStopIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addStopTextContainer: {
    flex: 1,
  },
  addStopTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark,
  },
  addStopSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Metrics Footer
  metricsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
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
  modalFormContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  useMyNumberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
  },
  useMyNumberToggleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  useMyNumberTextGroup: {
    flex: 1,
  },
  useMyNumberTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
  },
  useMyNumberSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  formSection: {
    gap: 6,
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  tagSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagOptionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagOptionPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  tagOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tagOptionTextSelected: {
    color: colors.onPrimary,
    fontWeight: '800',
  },

  modalActions: {
    marginTop: spacing.sm,
  },
});

export default MultiStopRouteCard;
