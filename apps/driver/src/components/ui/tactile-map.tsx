import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, Animated, Dimensions } from 'react-native';
import Svg, { Rect, Path, Circle, Defs, LinearGradient, Stop, G, Line } from 'react-native-svg';
import { Navigation, Compass, Layers, AlertCircle, ExternalLink } from 'lucide-react-native';
import { theme } from '../../theme/theme';

const { colors } = theme;

interface TactileMapProps {
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  pickupLabel?: string;
  dropoffLabel?: string;
  distanceKm?: number;
  durationMins?: number;
  isEnRoute?: boolean;
  vehicleType?: 'bike' | 'auto' | 'car' | 'pickup';
  showSurgeZones?: boolean;
  height?: number;
}

export function TactileMap({
  pickupCoords = { lat: 12.9352, lng: 77.6245 },
  dropoffCoords = { lat: 12.9716, lng: 77.5946 },
  pickupLabel = 'Koramangala 4th Block',
  dropoffLabel = 'Indiranagar 100ft Road',
  distanceKm = 4.8,
  durationMins = 14,
  isEnRoute = true,
  vehicleType = 'bike',
  showSurgeZones = false,
  height = 240,
}: TactileMapProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for driver radar
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
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

    // Vehicle progress along route
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim, progressAnim]);

  const openGoogleMapsNavigation = async () => {
    const lat = dropoffCoords.lat;
    const lng = dropoffCoords.lng;
    const navUrl = `google.navigation:q=${lat},${lng}&mode=d`;
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    try {
      const supported = await Linking.canOpenURL(navUrl);
      if (supported) {
        await Linking.openURL(navUrl);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.7, 0.3, 0],
  });

  return (
    <View style={[styles.container, { height }]}>
      {/* Vector Map Surface */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 240">
        <Defs>
          <LinearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E9EFE9" stopOpacity="1" />
            <Stop offset="1" stopColor="#E2EAE2" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#111813" stopOpacity="1" />
            <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="surgeKoramangala" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#EF4444" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>

        {/* Map Terrain Background */}
        <Rect width="400" height="240" fill="url(#mapBg)" />

        {/* Green Parks & Waterways */}
        <Path d="M-10,30 Q40,60 70,20 T150,10 L160,-10 L-10,-10 Z" fill="#D5E5D5" opacity="0.8" />
        <Path d="M260,190 Q300,160 360,180 T420,210 L420,260 L240,260 Z" fill="#D5E5D5" opacity="0.7" />
        <Path d="M120,130 Q160,140 180,110 T220,100 L210,140 Z" fill="#C8DDC8" opacity="0.5" />

        {/* Secondary Grid Lines */}
        <G stroke="#D8E2D8" strokeWidth="2.5" opacity="0.9">
          <Line x1="0" y1="60" x2="400" y2="60" />
          <Line x1="0" y1="120" x2="400" y2="120" />
          <Line x1="0" y1="180" x2="400" y2="180" />
          <Line x1="80" y1="0" x2="80" y2="240" />
          <Line x1="160" y1="0" x2="160" y2="240" />
          <Line x1="240" y1="0" x2="240" y2="240" />
          <Line x1="320" y1="0" x2="320" y2="240" />
        </G>

        {/* Major Arterial Roads / Expressways */}
        <G stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M-10,140 C80,140 120,90 200,85 S320,130 420,120" />
          <Path d="M160,-10 C160,80 180,120 230,250" />
          <Path d="M60,250 C70,160 140,80 280,30" />
        </G>
        <G stroke="#F4F8F4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M-10,140 C80,140 120,90 200,85 S320,130 420,120" />
          <Path d="M160,-10 C160,80 180,120 230,250" />
          <Path d="M60,250 C70,160 140,80 280,30" />
        </G>

        {/* Surge Pricing Hotspot Overlay (if enabled) */}
        {showSurgeZones && (
          <G>
            <Circle cx="120" cy="90" r="50" fill="url(#surgeKoramangala)" />
            <Circle cx="290" cy="140" r="45" fill="url(#surgeKoramangala)" />
          </G>
        )}

        {/* Route Shadow */}
        <Path
          d="M85,150 Q130,125 180,92 T305,65"
          fill="none"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Dispatch Route Polyline */}
        <Path
          d="M85,150 Q130,125 180,92 T305,65"
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Route Progress Dots */}
        <Path
          d="M85,150 Q130,125 180,92 T305,65"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeDasharray="6,6"
          strokeLinecap="round"
        />

        {/* Pickup Pin Marker (Start) */}
        <Circle cx="85" cy="150" r="10" fill="#111813" />
        <Circle cx="85" cy="150" r="5" fill="#6EE787" />

        {/* Dropoff Pin Marker (Destination) */}
        <Circle cx="305" cy="65" r="10" fill="#10B981" />
        <Circle cx="305" cy="65" r="4" fill="#FFFFFF" />

        {/* Driver Location on Route */}
        <Circle cx="190" cy="98" r="9" fill="#111813" stroke="#FFFFFF" strokeWidth="2.5" />
        <Circle cx="190" cy="98" r="4" fill="#6EE787" />
      </Svg>

      {/* Top Map Badges: Street / Compass */}
      <View style={styles.topHud}>
        <View style={styles.locationPill}>
          <Compass size={13} color="#111813" />
          <Text style={styles.locationText} numberOfLines={1}>
            {isEnRoute ? `To: ${dropoffLabel}` : `Pickup: ${pickupLabel}`}
          </Text>
        </View>

        {showSurgeZones && (
          <View style={styles.surgePill}>
            <Text style={styles.surgeText}>⚡ 1.4x Surge Area</Text>
          </View>
        )}
      </View>

      {/* Bottom Floating Navigation Cockpit */}
      <View style={styles.bottomHud}>
        <View style={styles.metricsBox}>
          <Text style={styles.etaValue}>{durationMins} min</Text>
          <Text style={styles.distanceValue}>{distanceKm} km remaining</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.googleMapsButton}
          onPress={openGoogleMapsNavigation}
        >
          <Navigation size={15} color="#FFFFFF" />
          <Text style={styles.googleMapsText}>Google Maps</Text>
          <ExternalLink size={12} color="#A7F3D0" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E9EFE9',
    position: 'relative',
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  topHud: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111813',
  },
  surgePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  surgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  bottomHud: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  metricsBox: {
    flexDirection: 'column',
  },
  etaValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111813',
    letterSpacing: -0.3,
  },
  distanceValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: -1,
  },
  googleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111813',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleMapsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
