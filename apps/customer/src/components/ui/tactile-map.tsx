/**
 * TactileMap.tsx
 * High-performance Neomorphic Vector Map for Atarashi Logistics Customer Experience.
 *
 * Features:
 * - Real-time courier position marker animated along route polyline (60fps spring/timing physics)
 * - Pulsing live radar beacon around active courier
 * - Live ETA pill badge ("Courier arriving in ~4 mins")
 * - High-contrast pickup (origin) & dropoff (destination) tactile pins
 * - Tactile floating bottom cockpit with courier identity and distance metrics
 * - Strict adherence to Neomorphic Light Mode (chalk background, white elevated cards, mint accents)
 */

import type { BookingStatus, Coordinates, VehicleType } from '@atarashi/domain';
import {
  Bike,
  Car,
  CircleCheck,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  LayoutChangeEvent,
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
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

import { theme } from '@/theme/theme';

export type MapPoint =
  | Coordinates
  | { lat: number; lng: number; latitude?: number; longitude?: number };

export interface TactileMapProps {
  pickupCoords?: MapPoint;
  dropoffCoords?: MapPoint;
  courierCoords?: MapPoint;
  pickupLabel?: string;
  dropoffLabel?: string;
  etaMins?: number;
  durationMins?: number;
  etaBadgeText?: string;
  statusText?: string;
  distanceKm?: number;
  isEnRoute?: boolean;
  showSurgeZones?: boolean;
  status?: BookingStatus;
  vehicleType?: VehicleType;
  courierName?: string;
  courierPlate?: string;
  onCallCourier?: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  showDriverHud?: boolean;
  showCourierMarker?: boolean;
  showEtaBadge?: boolean;
}

// Bezier control coordinates in 400x240 SVG viewbox
const ROUTE_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const SAMPLE_POINTS = ROUTE_STEPS.map((step) => {
  // Travel between 15% and 85% of route
  const t = 0.15 + step * 0.7;
  const invT = 1 - t;
  // Curve: P0=(80,160), P1=(185,80), P2=(320,65)
  const x = invT * invT * 80 + 2 * invT * t * 185 + t * t * 320;
  const y = invT * invT * 160 + 2 * invT * t * 80 + t * t * 65;
  return { x, y };
});

export function TactileMap({
  pickupCoords = { latitude: 12.9352, longitude: 77.6245 },
  dropoffCoords = { latitude: 12.9716, longitude: 77.5946 },
  pickupLabel = 'Koramangala 4th Block',
  dropoffLabel = 'Indiranagar 100ft Road',
  etaMins = 4,
  durationMins,
  etaBadgeText,
  statusText,
  distanceKm = 3.2,
  isEnRoute = true,
  showSurgeZones = false,
  status = 'in_transit',
  vehicleType = 'bike',
  courierName = 'Rajesh Kumar',
  courierPlate = 'KA 03 MZ 9814',
  onCallCourier,
  height = 250,
  style,
  testID,
  showDriverHud = false,
  showCourierMarker = false,
  showEtaBadge = false,
}: TactileMapProps) {
  const windowWidth = Dimensions.get('window').width;
  const [containerWidth, setContainerWidth] = useState<number>(
    Math.max(320, windowWidth - 32)
  );

  const effectiveMins = durationMins ?? etaMins;

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for live radar ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Courier travel simulation along route
    const travelLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    travelLoop.start();

    return () => {
      pulseLoop.stop();
      travelLoop.stop();
    };
  }, [pulseAnim, progressAnim]);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  const scaleX = containerWidth / 400;
  const scaleY = height / 240;

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.8],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.65, 0.25, 0],
  });

  const translateX = progressAnim.interpolate({
    inputRange: ROUTE_STEPS,
    outputRange: SAMPLE_POINTS.map((p) => p.x * scaleX - 19),
  });

  const translateY = progressAnim.interpolate({
    inputRange: ROUTE_STEPS,
    outputRange: SAMPLE_POINTS.map((p) => p.y * scaleY - 19),
  });

  const openGoogleMaps = async () => {
    const lat =
      'latitude' in dropoffCoords ? dropoffCoords.latitude : dropoffCoords.lat;
    const lng =
      'longitude' in dropoffCoords ? dropoffCoords.longitude : dropoffCoords.lng;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    try {
      await Linking.openURL(url);
    } catch {
      // Graceful degradation
    }
  };

  const handleCall = () => {
    if (onCallCourier) {
      onCallCourier();
    } else {
      Linking.openURL('tel:+919876543210').catch(() => {});
    }
  };

  const renderVehicleIcon = () => {
    switch (vehicleType) {
      case 'car':
        return <Car size={16} color={theme.colors.dark} />;
      case 'pickup':
        return <Truck size={16} color={theme.colors.dark} />;
      case 'auto':
      case 'bike':
      default:
        return <Bike size={16} color={theme.colors.dark} />;
    }
  };

  const resolvedEtaText =
    etaBadgeText ??
    (statusText
      ? `${statusText} (~${effectiveMins} mins)`
      : status === 'completed'
      ? 'Parcel Delivered'
      : status === 'pending'
      ? 'Assigning courier...'
      : `Courier arriving in ~${effectiveMins} mins`);

  return (
    <View
      testID={testID}
      style={[styles.container, { height }, style]}
      onLayout={onContainerLayout}
    >
      {/* Vector Surface */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 240">
        <Defs>
          <LinearGradient id="custMapBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#EEF4EE" stopOpacity="1" />
            <Stop offset="1" stopColor="#E2EBE2" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="custRouteGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#111813" stopOpacity="1" />
            <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Map Terrain */}
        <Rect width="400" height="240" fill="url(#custMapBg)" />

        {/* Green Parks & Land Blocks */}
        <Path
          d="M-10,20 Q40,65 75,18 T160,8 L160,-10 L-10,-10 Z"
          fill="#D6E7D6"
          opacity="0.8"
        />
        <Path
          d="M250,185 Q300,150 360,175 T420,205 L420,260 L230,260 Z"
          fill="#D6E7D6"
          opacity="0.75"
        />
        <Path
          d="M120,135 Q160,145 185,115 T225,105 L215,145 Z"
          fill="#C8DFC8"
          opacity="0.5"
        />

        {/* Secondary Street Grid */}
        <G stroke="#D8E4D8" strokeWidth="2.2" opacity="0.9">
          <Line x1="0" y1="55" x2="400" y2="55" />
          <Line x1="0" y1="115" x2="400" y2="115" />
          <Line x1="0" y1="175" x2="400" y2="175" />
          <Line x1="75" y1="0" x2="75" y2="240" />
          <Line x1="150" y1="0" x2="150" y2="240" />
          <Line x1="225" y1="0" x2="225" y2="240" />
          <Line x1="300" y1="0" x2="300" y2="240" />
          <Line x1="375" y1="0" x2="375" y2="240" />
        </G>

        {/* Arterial Avenues */}
        <G
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <Path d="M-10,135 C80,135 125,85 200,80 S320,125 420,115" fill="none" />
          <Path d="M150,-10 C150,80 170,120 220,250" fill="none" />
          <Path d="M50,250 C65,160 135,75 275,25" fill="none" />
        </G>
        <G
          stroke="#F4F8F4"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <Path d="M-10,135 C80,135 125,85 200,80 S320,125 420,115" fill="none" />
          <Path d="M150,-10 C150,80 170,120 220,250" fill="none" />
          <Path d="M50,250 C65,160 135,75 275,25" fill="none" />
        </G>

        {/* Route Soft Shadow */}
        <Path
          d="M80,160 Q185,80 320,65"
          fill="none"
          stroke="rgba(0,0,0,0.14)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Route Gradient Polyline */}
        <Path
          d="M80,160 Q185,80 320,65"
          fill="none"
          stroke="url(#custRouteGrad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Route Dashed Directional Track */}
        <Path
          d="M80,160 Q185,80 320,65"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeDasharray="5,5"
          strokeLinecap="round"
        />

        {/* Pickup Pin Marker (Origin) */}
        <Circle cx="80" cy="160" r="11" fill="#0F172A" />
        <Circle cx="80" cy="160" r="5" fill="#FFFFFF" />

        {/* Dropoff Pin Marker (Destination) */}
        <Circle cx="320" cy="65" r="11" fill="#475569" />
        <Circle cx="320" cy="65" r="4.5" fill="#FFFFFF" />
      </Svg>

      {/* Animated Moving Courier Marker (60fps Native Driver Transform) */}
      {showCourierMarker && (
        <Animated.View
          style={[
            styles.courierMarkerContainer,
            {
              transform: [{ translateX }, { translateY }],
            },
          ]}
        >
          {/* Pulsing Radar Ring */}
          <Animated.View
            style={[
              styles.radarWave,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          {/* Tactile Courier Bubble */}
          <View style={styles.courierBubble}>
            {renderVehicleIcon()}
            <View style={styles.courierLivePip} />
          </View>
        </Animated.View>
      )}

      {/* Top HUD: Live ETA Capsule Badge & Direction Chip */}
      {showEtaBadge && (
        <View style={styles.topHud}>
          <View style={styles.etaBadge}>
            <View style={styles.livePulseDotContainer}>
              <Animated.View
                style={[
                  styles.livePulseRing,
                  {
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
              <View style={styles.liveDotCore} />
            </View>
            <Text style={styles.etaBadgeText} numberOfLines={1}>
              {resolvedEtaText}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openGoogleMaps}
            style={styles.openMapBtn}
            accessibilityRole="button"
            accessibilityLabel="Open external Google Map"
          >
            <Compass size={13} color={theme.colors.dark} />
            <ExternalLink size={11} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Origin / Destination Mini Tags (Positioned over pins) */}
      <View
        style={[
          styles.pinTag,
          styles.pickupTag,
          { left: Math.max(12, 80 * scaleX - 35), top: 160 * scaleY + 14 },
        ]}
      >
        <MapPin size={10} color="#111813" />
        <Text style={styles.pinTagText} numberOfLines={1}>
          Pickup
        </Text>
      </View>

      <View
        style={[
          styles.pinTag,
          styles.dropoffTag,
          { left: Math.min(containerWidth - 90, 320 * scaleX - 30), top: 65 * scaleY - 26 },
        ]}
      >
        <CircleCheck size={10} color="#10B981" />
        <Text style={[styles.pinTagText, { color: '#047857' }]} numberOfLines={1}>
          Dropoff
        </Text>
      </View>

      {/* Bottom Floating Tactile Cockpit (Only shown when active delivery is in progress) */}
      {showDriverHud && (
        <View style={styles.bottomHud}>
          <View style={styles.courierIdentity}>
            <View style={styles.courierAvatar}>
              <Text style={styles.courierInitials}>
                {courierName.charAt(0).toUpperCase()}
              </Text>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={10} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.courierDetails}>
              <View style={styles.courierNameRow}>
                <Text style={styles.courierName} numberOfLines={1}>
                  {courierName}
                </Text>
              </View>
              <Text style={styles.courierVehicle} numberOfLines={1}>
                {courierPlate} • {distanceKm} km away
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCall}
            style={styles.callButton}
            accessibilityRole="button"
            accessibilityLabel={`Call courier ${courierName}`}
          >
            <Phone size={14} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EEF4EE',
    position: 'relative',
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E0E8E0',
    shadowColor: '#0E1E12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  topHud: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4EAD6',
    ...theme.shadows.card,
    maxWidth: '82%',
  },
  livePulseDotContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  livePulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.primary,
  },
  liveDotCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.primaryDark,
  },
  etaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E9E3',
    ...theme.shadows.card,
  },
  courierMarkerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  radarWave: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
  },
  courierBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.dark,
    shadowColor: '#0E1E12',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  courierLivePip: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  pinTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E2E9E3',
    zIndex: 6,
  },
  pickupTag: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  dropoffTag: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  pinTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#111813',
  },
  bottomHud: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#0E1E12',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  courierIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  courierAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  courierInitials: {
    color: theme.colors.onDark,
    fontSize: 13,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  courierDetails: {
    flex: 1,
  },
  courierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courierName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  courierVehicle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dark,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    gap: 5,
    ...theme.shadows.button,
  },
  callButtonText: {
    color: theme.colors.onDark,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default TactileMap;
