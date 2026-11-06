/**
 * location-picker-modal.tsx
 * Interactive Neomorphic Map Location Selecting & Pinpointing Modal for Atarashi Logistics.
 *
 * Adheres strictly to Neomorphic Light Mode design system:
 * - Chalk canvas (#F4F7F4)
 * - Elevated white cards (#FFFFFF) with dual soft shadows
 * - Vibrant light mint green (#6EE787 / #5EDB79) accents
 * - Charcoal typography (#111813)
 * - Capsule pill buttons
 */

import type { Coordinates } from '@atarashi/domain';
import {
  Check,
  Compass,
  Crosshair,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  GestureResponderEvent,
  Keyboard,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { PillButton } from '@/components/ui/pill-button';
import {
  BENGALURU_LOGISTICS_HUBS,
  LocationPrediction,
  reverseGeocodeCoordinates,
  searchLocationPlaces,
} from '@/lib/maps';
import { theme } from '@/theme/theme';

const { colors, spacing, shadows, radius } = theme;
const WHITE = '#FFFFFF';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 280;

export interface LocationPickerModalProps {
  visible: boolean;
  target: 'dropoff' | 'pickup';
  initialAddress: string;
  initialCoords: Coordinates;
  onClose: () => void;
  onConfirm: (address: string, coords: Coordinates) => void;
}

export function LocationPickerModal({
  visible,
  target,
  initialAddress,
  initialCoords,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [selectedCoords, setSelectedCoords] = useState<Coordinates>(initialCoords);
  const [landmarkName, setLandmarkName] = useState(
    target === 'dropoff' ? 'Drop-off Pin' : 'Pickup Pin'
  );

  // Pin animation
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Relative pin offset within the map viewport (normalized -1 to 1)
  const [pinOffset, setPinOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (visible) {
      setSelectedAddress(initialAddress);
      setSelectedCoords(initialCoords);
      setSearchQuery('');
      setPredictions([]);
      setPinOffset({ x: 0, y: 0 });

      // Trigger radar pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, initialAddress, initialCoords]);

  // Handle Autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setPredictions([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocationPlaces(searchQuery);
      setPredictions(results);
      setIsSearching(false);
    }, 280);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const bouncePin = () => {
    Animated.sequence([
      Animated.timing(pinBounceAnim, {
        toValue: -14,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(pinBounceAnim, {
        toValue: 0,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Map tap-to-pinpoint handler
  const handleMapPress = async (event: GestureResponderEvent) => {
    Keyboard.dismiss();
    const { locationX, locationY } = event.nativeEvent;
    const mapW = SCREEN_WIDTH - spacing.md * 2;
    const normX = (locationX - mapW / 2) / (mapW / 2);
    const normY = (locationY - MAP_HEIGHT / 2) / (MAP_HEIGHT / 2);

    setPinOffset({ x: normX, y: normY });
    bouncePin();

    // Map offset to Bengaluru coordinates delta (~0.04 lat/lng max span)
    const newLat = Number((initialCoords.latitude - normY * 0.035).toFixed(4));
    const newLng = Number((initialCoords.longitude + normX * 0.035).toFixed(4));
    const newCoords = { latitude: newLat, longitude: newLng };
    setSelectedCoords(newCoords);

    // Reverse geocode
    const { address, landmark } = await reverseGeocodeCoordinates(newLat, newLng);
    setSelectedAddress(address);
    setLandmarkName(landmark);
  };

  const handleSelectPrediction = (item: LocationPrediction) => {
    Keyboard.dismiss();
    setSelectedAddress(item.fullAddress);
    setSelectedCoords(item.coordinates);
    setLandmarkName(item.primaryText);
    setSearchQuery('');
    setPredictions([]);
    setPinOffset({ x: 0, y: 0 });
    bouncePin();
  };

  const handleConfirm = () => {
    onConfirm(selectedAddress, selectedCoords);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerSubtitle}>
              {target === 'dropoff' ? 'DELIVERY DESTINATION' : 'PARCEL PICKUP'}
            </Text>
            <Text style={styles.headerTitle}>
              {target === 'dropoff' ? 'Pinpoint Drop-off' : 'Pinpoint Pickup'}
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Compass size={12} color={colors.primaryDark} />
            <Text style={styles.badgeText}>Live GPS</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${target === 'dropoff' ? 'drop-off' : 'pickup'} address, landmark or area...`}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Autocomplete Predictions Dropdown */}
          {predictions.length > 0 && (
            <View style={styles.predictionsCard}>
              {predictions.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={[
                    styles.predictionRow,
                    idx < predictions.length - 1 && styles.predictionBorder,
                  ]}
                  onPress={() => handleSelectPrediction(item)}
                >
                  <View style={styles.predIconBox}>
                    <MapPin size={16} color={colors.primaryDark} />
                  </View>
                  <View style={styles.predTextCol}>
                    <Text style={styles.predPrimary} numberOfLines={1}>
                      {item.primaryText}
                    </Text>
                    <Text style={styles.predSecondary} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Hub Chips */}
          <Text style={styles.sectionHeading}>Quick Logistics Hubs</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {BENGALURU_LOGISTICS_HUBS.map((hub) => {
              const isSelected = selectedAddress.includes(hub.primaryText);
              return (
                <TouchableOpacity
                  key={hub.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => handleSelectPrediction(hub)}
                >
                  <MapPin
                    size={12}
                    color={isSelected ? WHITE : colors.textSecondary}
                  />
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {hub.primaryText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Interactive Tactile Map Canvas */}
          <View style={styles.mapCard}>
            <View style={styles.mapTopBar}>
              <View style={styles.mapInfoPill}>
                <Crosshair size={12} color={colors.primaryDark} />
                <Text style={styles.mapInfoText}>Tap map to reposition drop pin</Text>
              </View>
              <View style={styles.coordsPill}>
                <Text style={styles.coordsText}>
                  {selectedCoords.latitude.toFixed(4)}° N, {selectedCoords.longitude.toFixed(4)}° E
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.95}
              onPress={handleMapPress}
              style={styles.mapTouchSurface}
            >
              {/* Neomorphic Stylized Vector Map Graphics */}
              <Svg width={SCREEN_WIDTH - spacing.md * 2} height={MAP_HEIGHT}>
                <Defs>
                  <LinearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#EEF4EE" />
                    <Stop offset="100%" stopColor="#E4EDE4" />
                  </LinearGradient>
                  <LinearGradient id="arterialRoad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  </LinearGradient>
                </Defs>

                {/* Base Canvas */}
                <Rect width="100%" height="100%" fill="url(#mapBg)" />

                {/* City Blocks / Secondary Roads */}
                <G stroke="#D8E5D8" strokeWidth="6" opacity="0.7">
                  <Line x1="40" y1="0" x2="40" y2="280" />
                  <Line x1="120" y1="0" x2="120" y2="280" />
                  <Line x1="200" y1="0" x2="200" y2="280" />
                  <Line x1="280" y1="0" x2="280" y2="280" />
                  <Line x1="360" y1="0" x2="360" y2="280" />
                  <Line x1="0" y1="50" x2="420" y2="50" />
                  <Line x1="0" y1="110" x2="420" y2="110" />
                  <Line x1="0" y1="170" x2="420" y2="170" />
                  <Line x1="0" y1="230" x2="420" y2="230" />
                </G>

                {/* Primary Ring Road Arterials */}
                <Path
                  d="M 10 240 Q 140 180 200 130 T 400 30"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="10"
                />
                <Path
                  d="M 20 20 Q 180 80 220 160 T 390 260"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="10"
                />

                {/* Park / Greenery Zone */}
                <Rect x="60" y="130" width="45" height="35" rx="6" fill="#D3EAD3" />
                <Rect x="230" y="65" width="55" height="40" rx="6" fill="#D3EAD3" />
              </Svg>

              {/* Animated Radar Pulse at Pin */}
              <Animated.View
                style={[
                  styles.pulseBeacon,
                  {
                    left: (SCREEN_WIDTH - spacing.md * 2) / 2 + pinOffset.x * 120 - 24,
                    top: MAP_HEIGHT / 2 + pinOffset.y * 90 - 24,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />

              {/* Pinpoint Drop-off Pin Marker */}
              <Animated.View
                style={[
                  styles.pinMarkerContainer,
                  {
                    left: (SCREEN_WIDTH - spacing.md * 2) / 2 + pinOffset.x * 120 - 20,
                    top: MAP_HEIGHT / 2 + pinOffset.y * 90 - 40,
                    transform: [{ translateY: pinBounceAnim }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.pinHead,
                    target === 'dropoff' ? styles.pinDropoff : styles.pinPickup,
                  ]}
                >
                  <MapPin size={20} color={WHITE} />
                </View>
                <View style={styles.pinStem} />
                <View style={styles.pinShadow} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Selected Address Display Card */}
          <View style={styles.selectionCard}>
            <View style={styles.selectionHeader}>
              <View
                style={[
                  styles.selectionIconBox,
                  target === 'dropoff' ? styles.iconDropoff : styles.iconPickup,
                ]}
              >
                <Navigation size={18} color={target === 'dropoff' ? '#DC2626' : colors.primaryDark} />
              </View>
              <View style={styles.selectionDetails}>
                <Text style={styles.selectionType}>
                  {target === 'dropoff' ? 'PINPOINTED DROP-OFF POINT' : 'PINPOINTED PICKUP POINT'}
                </Text>
                <Text style={styles.selectionLandmark} numberOfLines={1}>
                  {landmarkName}
                </Text>
                <Text style={styles.selectionAddress}>
                  {selectedAddress}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Confirm Dock */}
        <View style={[styles.confirmDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <PillButton
            title={target === 'dropoff' ? 'Confirm Drop-off Pin →' : 'Confirm Pickup Pin →'}
            onPress={handleConfirm}
            style={styles.confirmBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: WHITE,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
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
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  predictionsCard: {
    backgroundColor: WHITE,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginBottom: 14,
    overflow: 'hidden',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  predictionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predTextCol: {
    flex: 1,
  },
  predPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  predSecondary: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  chipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: WHITE,
  },
  mapCard: {
    backgroundColor: WHITE,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: 14,
  },
  mapTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FAFDF9',
  },
  mapInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  coordsPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coordsText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mapTouchSurface: {
    height: MAP_HEIGHT,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseBeacon: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(110, 231, 135, 0.35)',
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },
  pinMarkerContainer: {
    position: 'absolute',
    width: 40,
    height: 50,
    alignItems: 'center',
  },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pinDropoff: {
    backgroundColor: '#DC2626', // Red for dropoff destination
  },
  pinPickup: {
    backgroundColor: colors.primaryDark, // Mint green for pickup
  },
  pinStem: {
    width: 3,
    height: 10,
    backgroundColor: colors.textPrimary,
  },
  pinShadow: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  selectionCard: {
    backgroundColor: WHITE,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDropoff: {
    backgroundColor: '#FEE2E2',
  },
  iconPickup: {
    backgroundColor: colors.primaryLight,
  },
  selectionDetails: {
    flex: 1,
  },
  selectionType: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  selectionLandmark: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  selectionAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  confirmDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  confirmBtn: {
    minHeight: 52,
  },
});
