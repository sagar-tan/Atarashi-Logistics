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
import { Image } from 'expo-image';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Crosshair,
  Globe,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
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
  fetchPlaceDetails,
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
  const [mapCenterCoords, setMapCenterCoords] = useState<Coordinates>(initialCoords);
  const [landmarkName, setLandmarkName] = useState(
    target === 'dropoff' ? 'Delivery Destination' : 'Pickup Location'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('satellite');
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [isMapImageLoading, setIsMapImageLoading] = useState(false);

  const GOOGLE_MAPS_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    'AIzaSyBR9AAM_0obBJGPKnS6KipiZ-_IM8VXfWU';

  const satelliteMapUrl = React.useMemo(() => {
    const lat = mapCenterCoords.latitude;
    const lng = mapCenterCoords.longitude;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoomLevel}&size=640x500&scale=2&maptype=hybrid&key=${GOOGLE_MAPS_KEY}`;
  }, [mapCenterCoords.latitude, mapCenterCoords.longitude, zoomLevel, GOOGLE_MAPS_KEY]);

  const streetMapUrl = React.useMemo(() => {
    const lat = mapCenterCoords.latitude;
    const lng = mapCenterCoords.longitude;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoomLevel}&size=640x500&scale=2&maptype=roadmap&key=${GOOGLE_MAPS_KEY}`;
  }, [mapCenterCoords.latitude, mapCenterCoords.longitude, zoomLevel, GOOGLE_MAPS_KEY]);

  // Fresh mutable refs to completely eliminate stale closures in PanResponder & gesture callbacks
  const selectedAddressRef = useRef<string>(initialAddress);
  const selectedCoordsRef = useRef<Coordinates>(initialCoords);
  const mapCenterCoordsRef = useRef<Coordinates>(initialCoords);
  const zoomLevelRef = useRef<number>(18);

  // Keep refs continually synchronized with state
  selectedAddressRef.current = selectedAddress;
  selectedCoordsRef.current = selectedCoords;
  mapCenterCoordsRef.current = mapCenterCoords;
  zoomLevelRef.current = zoomLevel;

  const handleZoomIn = () => {
    const currentPin = selectedCoordsRef.current;
    mapCenterCoordsRef.current = currentPin;
    setMapCenterCoords(currentPin);
    currentPanRef.current = { x: 0, y: 0 };
    mapPanX.setValue(0);
    mapPanY.setValue(0);
    setZoomLevel((prev) => {
      const next = Math.min(prev + 1, 20);
      zoomLevelRef.current = next;
      return next;
    });
  };

  const handleZoomOut = () => {
    const currentPin = selectedCoordsRef.current;
    mapCenterCoordsRef.current = currentPin;
    setMapCenterCoords(currentPin);
    currentPanRef.current = { x: 0, y: 0 };
    mapPanX.setValue(0);
    mapPanY.setValue(0);
    setZoomLevel((prev) => {
      const next = Math.max(prev - 1, 14);
      zoomLevelRef.current = next;
      return next;
    });
  };

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
      selectedAddressRef.current = initialAddress;
      selectedCoordsRef.current = initialCoords;
      mapCenterCoordsRef.current = initialCoords;
      zoomLevelRef.current = 18;

      setSelectedAddress(initialAddress);
      setSelectedCoords(initialCoords);
      setMapCenterCoords(initialCoords);
      setZoomLevel(18);
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
    // ALWAYS pull freshest base coordinate and zoom from refs to prevent closure staleness
    const center = mapCenterCoordsRef.current;
    const currentZoom = zoomLevelRef.current;

    const metersPerPixel = 0.58 * Math.pow(2, 18 - currentZoom);
    const latDelta = (dy * metersPerPixel) / 111000;
    const lngDelta =
      -(dx * metersPerPixel) /
      (111000 * Math.cos((center.latitude * Math.PI) / 180));

    const newLat = Number((center.latitude + latDelta).toFixed(6));
    const newLng = Number((center.longitude + lngDelta).toFixed(6));
    const newCoords = { latitude: newLat, longitude: newLng };

    selectedCoordsRef.current = newCoords;
    setSelectedCoords(newCoords);

    // Reverse geocode to get live road name & formatted address
    const { address, landmark } = await reverseGeocodeCoordinates(newLat, newLng);
    selectedAddressRef.current = address;
    setSelectedAddress(address);
    setLandmarkName(landmark);

    // If panned significantly (> 140px from image center), re-center tile smoothly
    if (Math.hypot(dx, dy) > 140) {
      mapCenterCoordsRef.current = newCoords;
      setMapCenterCoords(newCoords);
      currentPanRef.current = { x: 0, y: 0 };
      mapPanX.setValue(0);
      mapPanY.setValue(0);
    }
  };

  // Ref hook to always invoke latest applyCoordinateShift from PanResponder
  const applyCoordinateShiftRef = useRef(applyCoordinateShift);
  applyCoordinateShiftRef.current = applyCoordinateShift;

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
        applyCoordinateShiftRef.current(currentPanRef.current.x, currentPanRef.current.y);
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
      applyCoordinateShiftRef.current(nextX, nextY);
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
      selectedCoordsRef.current = initialCoords;
      mapCenterCoordsRef.current = initialCoords;
      setSelectedCoords(initialCoords);
      setMapCenterCoords(initialCoords);
      const { address, landmark } = await reverseGeocodeCoordinates(
        initialCoords.latitude,
        initialCoords.longitude
      );
      selectedAddressRef.current = address;
      setSelectedAddress(address);
      setLandmarkName(landmark);
    });
  };

  // Prediction item selection
  const handleSelectPrediction = async (item: LocationPrediction) => {
    Keyboard.dismiss();
    let coords = item.coordinates;
    let fullAddr = item.fullAddress;
    let primary = item.primaryText;

    // Fetch high-precision GPS coordinates from Google Places if available
    if (item.id && !item.id.startsWith('blr_')) {
      const details = await fetchPlaceDetails(item.id, fullAddr);
      if (details) {
        coords = details.coordinates;
        if (details.address) {
          fullAddr = details.address;
        }
      }
    }

    selectedCoordsRef.current = coords;
    mapCenterCoordsRef.current = coords;
    selectedAddressRef.current = fullAddr;

    setSelectedAddress(fullAddr);
    setSelectedCoords(coords);
    setMapCenterCoords(coords);
    setLandmarkName(primary);
    setSearchQuery('');
    setPredictions([]);
    currentPanRef.current = { x: 0, y: 0 };
    mapPanX.setValue(0);
    mapPanY.setValue(0);

    liftPin();
    Animated.parallel([
      Animated.spring(mapPanX, {
        toValue: 0,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(mapPanY, {
        toValue: 0,
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
  const pinColor = isPickup ? '#0F172A' : '#334155';
  const pinLightColor = isPickup ? '#F1F5F9' : '#E2E8F0';

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
              {/* Pan-able Vector / Satellite Canvas underneath */}
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
                  {/* Real Google Maps Satellite (Hybrid) or Roadmap Imagery */}
                  <Image
                    source={{
                      uri: mapMode === 'satellite' ? satelliteMapUrl : streetMapUrl,
                    }}
                    style={{
                      width: Math.max(SCREEN_WIDTH * 2.5, 960),
                      height: Math.max(mapViewportHeight * 2.5, 800),
                    }}
                    contentFit="cover"
                    transition={200}
                    onLoadStart={() => setIsMapImageLoading(true)}
                    onLoadEnd={() => setIsMapImageLoading(false)}
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Animated Radar Pulse at Center */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.centerRadarPulse,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: mapMode === 'satellite' ? '#6EE787' : pinColor,
                    backgroundColor: mapMode === 'satellite'
                      ? 'rgba(110, 231, 135, 0.18)'
                      : isPickup
                      ? 'rgba(15, 23, 42, 0.12)'
                      : 'rgba(51, 65, 85, 0.12)',
                  },
                ]}
              />

              {/* FIXED CENTER PIN WITH PORTER-STYLE SPEECH BUBBLE TOOLTIP */}
              <View pointerEvents="none" style={styles.fixedPinContainer}>
                {/* Speech Bubble Tooltip */}
                <Animated.View
                  style={[
                    styles.speechBubble,
                    mapMode === 'satellite' && styles.speechBubbleSatellite,
                    {
                      transform: [{ translateY: pinBounceAnim }],
                    },
                  ]}
                >
                  <Text style={[styles.speechBubbleText, mapMode === 'satellite' && styles.speechBubbleTextSatellite]}>
                    {isPickup
                      ? 'Your goods will be picked from here'
                      : 'Your goods will be dropped here'}
                  </Text>
                  {/* Downward triangle pointer */}
                  <View style={[styles.speechBubbleArrow, mapMode === 'satellite' && styles.speechBubbleArrowSatellite]} />
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
                      {
                        backgroundColor: mapMode === 'satellite' ? '#10B981' : pinColor,
                        borderWidth: mapMode === 'satellite' ? 2 : 0,
                        borderColor: WHITE,
                      },
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
                      { borderTopColor: mapMode === 'satellite' ? '#10B981' : pinColor },
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

              {/* Map Mode Switcher (Street vs Satellite Toggle Pill) */}
              <View style={styles.mapModeSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.mapModeBtn,
                    mapMode === 'street' && styles.mapModeBtnActive,
                  ]}
                  onPress={() => setMapMode('street')}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Street map view"
                >
                  <Layers
                    size={13}
                    color={mapMode === 'street' ? WHITE : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.mapModeText,
                      mapMode === 'street' && styles.mapModeTextActive,
                    ]}
                  >
                    Street
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.mapModeBtn,
                    mapMode === 'satellite' && styles.mapModeBtnActive,
                  ]}
                  onPress={() => {
                    setMapMode('satellite');
                    if (zoomLevel < 18) setZoomLevel(18);
                  }}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Satellite rooftop view"
                >
                  <Globe
                    size={13}
                    color={mapMode === 'satellite' ? WHITE : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.mapModeText,
                      mapMode === 'satellite' && styles.mapModeTextActive,
                    ]}
                  >
                    Satellite
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Floating Map Controls: Zoom In, Zoom Out, Recenter GPS & Fullscreen */}
              <View style={styles.floatingControls}>
                <TouchableOpacity
                  style={styles.floatingControlBtn}
                  onPress={handleZoomIn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Zoom In map"
                >
                  <Plus size={18} color={colors.primaryDark} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.floatingControlBtn}
                  onPress={handleZoomOut}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Zoom Out map"
                >
                  <Minus size={18} color={colors.primaryDark} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.floatingControlBtn}
                  onPress={handleRecenterGPS}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Recenter map to GPS"
                >
                  <LocateFixed size={18} color={colors.primaryDark} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.floatingControlBtn}
                  onPress={() => setIsFullscreen(!isFullscreen)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
                >
                  {isFullscreen ? (
                    <Minimize2 size={18} color={colors.textPrimary} />
                  ) : (
                    <Maximize2 size={18} color={colors.textPrimary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Hint Pill at Top of Map */}
              <View pointerEvents="none" style={styles.mapHintPill}>
                {mapMode === 'satellite' ? (
                  <>
                    <Globe size={11} color="#10B981" />
                    <Text style={styles.mapHintText}>
                      Satellite HD • Zoom {zoomLevel}x • Align pin on rooftop or gate
                    </Text>
                  </>
                ) : (
                  <>
                    <Crosshair size={11} color={colors.primaryDark} />
                    <Text style={styles.mapHintText}>
                      Street Map • Zoom {zoomLevel}x • Drag map to position pin
                    </Text>
                  </>
                )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapSvgTouchBox: {
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 8,
    zIndex: 20,
  },
  floatingControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  mapModeSwitcher: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
    borderWidth: 1.5,
    borderColor: colors.border,
    zIndex: 20,
    ...shadows.floating,
  },
  mapModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  mapModeBtnActive: {
    backgroundColor: colors.primaryDark,
  },
  mapModeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  mapModeTextActive: {
    color: WHITE,
  },
  speechBubbleSatellite: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  speechBubbleTextSatellite: {
    color: WHITE,
  },
  speechBubbleArrowSatellite: {
    borderTopColor: '#0F172A',
  },
  mapHintPill: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    zIndex: 15,
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
