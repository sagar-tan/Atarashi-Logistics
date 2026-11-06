/**
 * location-picker-modal.tsx
 * Interactive Neomorphic Map Location Selecting & Pinpointing Modal for Atarashi Logistics.
 *
 * Implements the Porter Pinpoint UX:
 * - Fixed center pin with speech bubble tooltip:
 *   - Mode 'pickup': "Your goods will be picked from here", Green circular pin with ArrowUp, contact shadow dot.
 *   - Mode 'dropoff': "Your goods will be dropped here", Coral/Red circular pin with ArrowDown, contact shadow dot.
 * - Map panning underneath the center pin with touch and gesture drag.
 * - Floating reverse-geocoded road name card positioned directly above bottom CTA.
 * - Floating map controls: Recenter GPS target button and Fullscreen view toggle.
 * - Autocomplete search bar with clear button (X) and instant predictions dropdown.
 * - Continuous capsule "Confirm Location" CTA.
 * - Strict Neomorphic Light Mode design system:
 *   - Chalk canvas (#F4F7F4), elevated white cards (#FFFFFF) with dual soft shadows,
 *   - Mint green accents (#6EE787 / #2F8544), rich charcoal typography (#111813),
 *   - Zero glassmorphism.
 */

import type { Coordinates } from '@atarashi/domain';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Crosshair,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAP_HEIGHT_NORMAL = 310;

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
    target === 'dropoff' ? 'Delivery Destination' : 'Pickup Location'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Map panning animation offsets
  const mapPanX = useRef(new Animated.Value(0)).current;
  const mapPanY = useRef(new Animated.Value(0)).current;
  const currentPanRef = useRef({ x: 0, y: 0 });

  // Pin tactile lift & bounce animation
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const pinShadowScale = useRef(new Animated.Value(1)).current;

  // Radar beacon pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setSelectedAddress(initialAddress);
      setSelectedCoords(initialCoords);
      setSearchQuery('');
      setPredictions([]);
      setIsFullscreen(false);
      mapPanX.setValue(0);
      mapPanY.setValue(0);
      currentPanRef.current = { x: 0, y: 0 };

      // Initialize landmark from initial address
      const parts = initialAddress.split(',');
      if (parts.length > 0 && parts[0].trim()) {
        setLandmarkName(parts[0].trim());
      }

      // Radar pulse loop
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [visible, initialAddress, initialCoords]);

  // Autocomplete search debounce
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

  // Tactile pin bounce animation (lift on drag, snap down on drop)
  const liftPin = () => {
    Animated.parallel([
      Animated.timing(pinBounceAnim, {
        toValue: -14,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(pinShadowScale, {
        toValue: 0.65,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dropPin = () => {
    Animated.parallel([
      Animated.spring(pinBounceAnim, {
        toValue: 0,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(pinShadowScale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Convert map pan offset to geographic lat/lng coordinate shift
  const applyCoordinateShift = async (dx: number, dy: number) => {
    // 100 pixels in map viewport corresponds to ~0.005 degrees (~550 meters)
    const latDelta = -(dy / 100) * 0.005;
    const lngDelta = (dx / 100) * 0.005;

    const newLat = Number((initialCoords.latitude + latDelta).toFixed(4));
    const newLng = Number((initialCoords.longitude + lngDelta).toFixed(4));
    const newCoords = { latitude: newLat, longitude: newLng };
    setSelectedCoords(newCoords);

    // Reverse geocode to get live road name & formatted address
    const { address, landmark } = await reverseGeocodeCoordinates(newLat, newLng);
    setSelectedAddress(address);
    setLandmarkName(landmark);
  };

  // Map touch drag responder for continuous panning
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        Keyboard.dismiss();
        liftPin();
      },
      onPanResponderMove: (_, gesture) => {
        const nextX = currentPanRef.current.x + gesture.dx;
        const nextY = currentPanRef.current.y + gesture.dy;
        mapPanX.setValue(nextX);
        mapPanY.setValue(nextY);
      },
      onPanResponderRelease: (_, gesture) => {
        currentPanRef.current.x += gesture.dx;
        currentPanRef.current.y += gesture.dy;
        dropPin();
        applyCoordinateShift(currentPanRef.current.x, currentPanRef.current.y);
      },
      onPanResponderTerminate: () => {
        dropPin();
      },
    })
  ).current;

  // Tap-to-recenter map on specific point
  const handleMapTap = (event: GestureResponderEvent) => {
    Keyboard.dismiss();
    const { locationX, locationY } = event.nativeEvent;
    const currentMapHeight = isFullscreen
      ? SCREEN_HEIGHT - insets.top - insets.bottom - 220
      : MAP_HEIGHT_NORMAL;
    const mapW = SCREEN_WIDTH - (isFullscreen ? 0 : spacing.md * 2);

    const deltaX = locationX - mapW / 2;
    const deltaY = locationY - currentMapHeight / 2;

    const nextX = currentPanRef.current.x - deltaX * 0.8;
    const nextY = currentPanRef.current.y - deltaY * 0.8;
    currentPanRef.current = { x: nextX, y: nextY };

    liftPin();
    Animated.parallel([
      Animated.spring(mapPanX, {
        toValue: nextX,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(mapPanY, {
        toValue: nextY,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dropPin();
      applyCoordinateShift(nextX, nextY);
    });
  };

  // Recenter GPS handler
  const handleRecenterGPS = () => {
    Keyboard.dismiss();
    currentPanRef.current = { x: 0, y: 0 };
    liftPin();
    Animated.parallel([
      Animated.spring(mapPanX, {
        toValue: 0,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(mapPanY, {
        toValue: 0,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      dropPin();
      setSelectedCoords(initialCoords);
      const { address, landmark } = await reverseGeocodeCoordinates(
        initialCoords.latitude,
        initialCoords.longitude
      );
      setSelectedAddress(address);
      setLandmarkName(landmark);
    });
  };

  // Prediction item selection
  const handleSelectPrediction = (item: LocationPrediction) => {
    Keyboard.dismiss();
    setSelectedAddress(item.fullAddress);
    setSelectedCoords(item.coordinates);
    setLandmarkName(item.primaryText);
    setSearchQuery('');
    setPredictions([]);

    // Calculate delta relative to initialCoords
    const latDiff = item.coordinates.latitude - initialCoords.latitude;
    const lngDiff = item.coordinates.longitude - initialCoords.longitude;

    const targetX = (lngDiff / 0.005) * 100;
    const targetY = -(latDiff / 0.005) * 100;
    currentPanRef.current = { x: targetX, y: targetY };

    liftPin();
    Animated.parallel([
      Animated.spring(mapPanX, {
        toValue: targetX,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(mapPanY, {
        toValue: targetY,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dropPin();
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedAddress, selectedCoords);
    onClose();
  };

  const mapViewportHeight = isFullscreen
    ? SCREEN_HEIGHT - insets.top - insets.bottom - 210
    : MAP_HEIGHT_NORMAL;

  const isPickup = target === 'pickup';
  const pinColor = isPickup ? '#2F8544' : '#DC2626';
  const pinLightColor = isPickup ? '#E8F9EC' : '#FEE2E2';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close pin picker"
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerSubtitle}>
              {isPickup ? 'PARCEL PICKUP LOCATION' : 'DELIVERY DESTINATION'}
            </Text>
            <Text style={styles.headerTitle}>
              {isPickup ? 'Pinpoint Pickup Location' : 'Pinpoint Drop-off Location'}
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Compass size={12} color={colors.primaryDark} />
            <Text style={styles.badgeText}>Live GPS</Text>
          </View>
        </View>

        {/* Search Bar with Clear Button */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${isPickup ? 'pickup' : 'drop-off'} landmark, road or area...`}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Autocomplete Predictions Dropdown */}
        {predictions.length > 0 && (
          <View style={styles.predictionsDropdownWrapper}>
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
                  <View
                    style={[
                      styles.predIconBox,
                      { backgroundColor: pinLightColor },
                    ]}
                  >
                    <MapPin size={16} color={pinColor} />
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
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isFullscreen && styles.scrollContentFullscreen,
            { paddingBottom: Math.max(insets.bottom, 16) + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isFullscreen}
        >
          {/* Quick Hub Chips (shown when not fullscreen) */}
          {!isFullscreen && (
            <View style={styles.quickHubsSection}>
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
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {hub.primaryText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Map Viewport Card */}
          <View
            style={[
              styles.mapCard,
              isFullscreen && styles.mapCardFullscreen,
              { height: mapViewportHeight },
            ]}
          >
            {/* Map Drag / Tap Surface */}
            <View
              {...panResponder.panHandlers}
              style={[styles.mapTouchSurface, { height: mapViewportHeight }]}
            >
              {/* Pan-able Vector SVG Map Canvas underneath */}
              <Animated.View
                style={[
                  styles.mapSvgCanvas,
                  {
                    transform: [
                      { translateX: mapPanX },
                      { translateY: mapPanY },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleMapTap}
                  style={styles.mapSvgTouchBox}
                >
                  <Svg width={SCREEN_WIDTH * 2.4} height={mapViewportHeight * 2.4}>
                    <Defs>
                      <LinearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#EEF4EE" />
                        <Stop offset="100%" stopColor="#E4EDE4" />
                      </LinearGradient>
                    </Defs>

                    {/* Base Background */}
                    <Rect width="100%" height="100%" fill="url(#mapBg)" />

                    {/* Secondary Roads & Street Blocks */}
                    <G stroke="#D8E5D8" strokeWidth="6" opacity="0.75">
                      <Line x1="60" y1="0" x2="60" y2="1000" />
                      <Line x1="160" y1="0" x2="160" y2="1000" />
                      <Line x1="260" y1="0" x2="260" y2="1000" />
                      <Line x1="360" y1="0" x2="360" y2="1000" />
                      <Line x1="460" y1="0" x2="460" y2="1000" />
                      <Line x1="560" y1="0" x2="560" y2="1000" />
                      <Line x1="660" y1="0" x2="660" y2="1000" />
                      <Line x1="760" y1="0" x2="760" y2="1000" />
                      <Line x1="0" y1="70" x2="1000" y2="70" />
                      <Line x1="0" y1="160" x2="1000" y2="160" />
                      <Line x1="0" y1="250" x2="1000" y2="250" />
                      <Line x1="0" y1="340" x2="1000" y2="340" />
                      <Line x1="0" y1="430" x2="1000" y2="430" />
                      <Line x1="0" y1="520" x2="1000" y2="520" />
                    </G>

                    {/* Primary Expressways & Ring Arterials */}
                    <Path
                      d="M 20 540 Q 240 380 420 280 T 900 120"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="12"
                    />
                    <Path
                      d="M 40 40 Q 320 180 440 340 T 820 620"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="12"
                    />

                    {/* Green Public Parks & Logistics Hub Clusters */}
                    <Rect x="120" y="220" width="80" height="60" rx="8" fill="#D3EAD3" />
                    <Rect x="460" y="110" width="100" height="70" rx="8" fill="#D3EAD3" />
                    <Rect x="300" y="380" width="90" height="65" rx="8" fill="#D3EAD3" />

                    {/* Hub Marker Dots */}
                    <Circle cx="400" cy="270" r="6" fill="#6EE787" />
                    <Circle cx="240" cy="180" r="6" fill="#6EE787" />
                    <Circle cx="580" cy="350" r="6" fill="#6EE787" />
                  </Svg>
                </TouchableOpacity>
              </Animated.View>

              {/* Animated Radar Pulse at Center */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.centerRadarPulse,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: pinColor,
                    backgroundColor: isPickup
                      ? 'rgba(110, 231, 135, 0.22)'
                      : 'rgba(239, 68, 68, 0.22)',
                  },
                ]}
              />

              {/* FIXED CENTER PIN WITH PORTER-STYLE SPEECH BUBBLE TOOLTIP */}
              <View pointerEvents="none" style={styles.fixedPinContainer}>
                {/* Speech Bubble Tooltip */}
                <Animated.View
                  style={[
                    styles.speechBubble,
                    {
                      transform: [{ translateY: pinBounceAnim }],
                    },
                  ]}
                >
                  <Text style={styles.speechBubbleText}>
                    {isPickup
                      ? 'Your goods will be picked from here'
                      : 'Your goods will be dropped here'}
                  </Text>
                  {/* Downward triangle pointer */}
                  <View style={styles.speechBubbleArrow} />
                </Animated.View>

                {/* Animated Circular Pin Marker */}
                <Animated.View
                  style={[
                    styles.pinMarker,
                    {
                      transform: [{ translateY: pinBounceAnim }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pinHead,
                      { backgroundColor: pinColor },
                    ]}
                  >
                    {isPickup ? (
                      <ArrowUp size={20} color={WHITE} strokeWidth={2.8} />
                    ) : (
                      <ArrowDown size={20} color={WHITE} strokeWidth={2.8} />
                    )}
                  </View>
                  {/* Pin Needle Stem */}
                  <View
                    style={[
                      styles.pinStem,
                      { borderTopColor: pinColor },
                    ]}
                  />
                </Animated.View>

                {/* Contact Shadow Dot on Ground */}
                <Animated.View
                  style={[
                    styles.contactShadowDot,
                    {
                      transform: [{ scale: pinShadowScale }],
                    },
                  ]}
                />
              </View>

              {/* Floating Map Controls: Recenter GPS & Fullscreen */}
              <View style={styles.floatingControls}>
                <TouchableOpacity
                  style={styles.floatingControlBtn}
                  onPress={handleRecenterGPS}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Recenter map to GPS"
                >
                  <LocateFixed size={20} color={colors.primaryDark} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.floatingControlBtn}
                  onPress={() => setIsFullscreen(!isFullscreen)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
                >
                  {isFullscreen ? (
                    <Minimize2 size={20} color={colors.textPrimary} />
                  ) : (
                    <Maximize2 size={20} color={colors.textPrimary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Hint Pill at Top of Map */}
              <View pointerEvents="none" style={styles.mapHintPill}>
                <Crosshair size={12} color={colors.primaryDark} />
                <Text style={styles.mapHintText}>
                  Drag map to position pin directly on the doorstep
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* FLOATING REVERSE-GEOCODED ROAD NAME CARD + CONFIRM DOCK */}
        <View
          style={[
            styles.bottomDockContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Floating Road Name Card Positioned Right Above CTA */}
          <View style={styles.roadNameCard}>
            <View
              style={[
                styles.roadNameIconBox,
                { backgroundColor: pinLightColor },
              ]}
            >
              <Navigation size={18} color={pinColor} />
            </View>

            <View style={styles.roadNameContent}>
              <View style={styles.roadNameTagRow}>
                <Text style={styles.roadNameBadge}>
                  {isPickup ? 'PICKUP ROAD / LANDMARK' : 'DROP-OFF ROAD / LANDMARK'}
                </Text>
                <Text style={styles.coordsReadout}>
                  {selectedCoords.latitude.toFixed(4)}° N, {selectedCoords.longitude.toFixed(4)}° E
                </Text>
              </View>

              <Text style={styles.roadNameTitle} numberOfLines={1}>
                {landmarkName}
              </Text>
              <Text style={styles.roadNameAddress} numberOfLines={2}>
                {selectedAddress}
              </Text>
            </View>
          </View>

          {/* Confirm Location Continuous Capsule CTA */}
          <PillButton
            title={isPickup ? 'Confirm Pickup Location →' : 'Confirm Location →'}
            onPress={handleConfirm}
            size="lg"
            variant="primary"
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
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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
  predictionsDropdownWrapper: {
    position: 'absolute',
    top: 128,
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
  },
  predictionsCard: {
    backgroundColor: WHITE,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predTextCol: {
    flex: 1,
  },
  predPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  predSecondary: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: 12,
  },
  scrollContentFullscreen: {
    padding: 0,
  },
  quickHubsSection: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
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
    position: 'relative',
    ...shadows.card,
  },
  mapCardFullscreen: {
    borderRadius: 0,
    borderWidth: 0,
    marginHorizontal: 0,
  },
  mapTouchSurface: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapSvgCanvas: {
    position: 'absolute',
    left: -SCREEN_WIDTH * 0.7,
    top: -MAP_HEIGHT_NORMAL * 0.7,
  },
  mapSvgTouchBox: {
    width: SCREEN_WIDTH * 2.4,
    height: MAP_HEIGHT_NORMAL * 2.4,
  },
  centerRadarPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
  },
  fixedPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  speechBubble: {
    backgroundColor: WHITE,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    alignItems: 'center',
    ...shadows.card,
  },
  speechBubbleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  speechBubbleArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: WHITE,
  },
  pinMarker: {
    alignItems: 'center',
  },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  pinStem: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  contactShadowDot: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(17, 24, 19, 0.35)',
    marginTop: 1,
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 10,
    zIndex: 20,
  },
  floatingControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.button,
  },
  mapHintPill: {
    position: 'absolute',
    top: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  mapHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottomDockContainer: {
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
    zIndex: 30,
  },
  roadNameCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  roadNameIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  roadNameContent: {
    flex: 1,
  },
  roadNameTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  roadNameBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  coordsReadout: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
  roadNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  roadNameAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  confirmBtn: {
    minHeight: 52,
  },
});
