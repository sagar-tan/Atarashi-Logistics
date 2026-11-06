import { Image } from 'expo-image';
import {
  Bell,
  Bike,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock,
  IndianRupee,
  KeyRound,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Camera,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  X,
  FileCheck,
  Layers,
  Award,
  MessageSquare,
  Truck,
  Check,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { NeomorphCard } from '@/components/ui/neomorph-card';
import { PillButton } from '@/components/ui/pill-button';
import { PillTabs } from '@/components/ui/pill-tabs';
import { TactileCard } from '@/components/ui/tactile-card';
import { TactileMap } from '@/components/ui/tactile-map';
import { theme } from '@/theme/theme';

const { colors, spacing, sizes } = theme;

// State machine phases
type DriverState =
  | 'offline'
  | 'online_idle'
  | 'incoming_request'
  | 'en_route_pickup'
  | 'at_pickup'
  | 'in_transit'
  | 'at_dropoff'
  | 'payout_celebration';

interface DeliveryJob {
  id: string;
  pickupDistance: string;
  dropoffDistance: string;
  pickupAddress: string;
  senderName: string;
  senderPhone: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  packageSize: string;
  packageCategory: string;
  weightKg: number;
  dimensions: string;
  hasHelper: boolean;
  helperAllowancePaise: number;
  specialInstructions: string;
  vehicle: 'Bike' | 'Auto' | 'Car' | 'Pickup';
  farePaise: number; // Stored in integer paise (₹ 235.00 = 23500 paise with helper)
  expectedPickupOtp: string;
  expectedDeliveryPin: string;
}

const SAMPLE_JOB: DeliveryJob = {
  id: 'BK-8942',
  pickupDistance: '1.2 km away',
  dropoffDistance: '4.8 km',
  pickupAddress: 'Indiranagar 100ft Road, 12th Main, Bengaluru',
  senderName: 'Rahul Sharma (Sharma Electronics)',
  senderPhone: '+91 98765 43210',
  dropoffAddress: 'Flat 402, Green Glen Heights, Koramangala 4th Block, Bengaluru',
  recipientName: 'Priya Patel',
  recipientPhone: '+91 98123 45678',
  packageSize: 'Medium Box (18 kg)',
  packageCategory: 'Electronics & Audio Hardware',
  weightKg: 18,
  dimensions: '45 × 30 × 30 cm',
  hasHelper: true,
  helperAllowancePaise: 5000, // ₹ 50.00 labour allowance
  specialInstructions: 'Fragile cartons: Keep upright and do not stack heavy loads.',
  vehicle: 'Bike',
  farePaise: 23500, // ₹ 235.00
  expectedPickupOtp: '5821',
  expectedDeliveryPin: '9412',
};

interface TripRecord {
  id: string;
  time: string;
  farePaise: number;
  pickup: string;
  dropoff: string;
}

export default function DriverHomeScreen() {
  const [driverState, setDriverState] = useState<DriverState>('offline');
  const [activeTab, setActiveTab] = useState<'shift' | 'earnings' | 'trips'>('shift');

  // Financial & trip metrics (stored in integer paise)
  const [todayEarningsPaise, setTodayEarningsPaise] = useState<number>(0);
  const [todayTripsCount, setTodayTripsCount] = useState<number>(0);
  const [codCashInHandPaise, setCodCashInHandPaise] = useState<number>(35000); // ₹ 350.00 cash held
  const [completedTrips, setCompletedTrips] = useState<TripRecord[]>([]);

  // Porter Features: Proof of Delivery (POD) states
  const [pickupPhotoTaken, setPickupPhotoTaken] = useState(false);
  const [dropoffPhotoTaken, setDropoffPhotoTaken] = useState(false);
  const [customerSigned, setCustomerSigned] = useState(false);

  // Modals
  const [showSosModal, setShowSosModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSurgeZones, setShowSurgeZones] = useState(true);

  // Verification Inputs & Loading states
  const [pickupOtp, setPickupOtp] = useState('');
  const [pickupOtpError, setPickupOtpError] = useState('');
  const [isVerifyingPickup, setIsVerifyingPickup] = useState(false);

  const [deliveryPin, setDeliveryPin] = useState('');
  const [deliveryPinError, setDeliveryPinError] = useState('');
  const [isVerifyingDelivery, setIsVerifyingDelivery] = useState(false);

  // Incoming Request Countdown (30s)
  const [countdownSeconds, setCountdownSeconds] = useState(30);
  const countdownProgress = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for online indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing green dot when online
  useEffect(() => {
    if (driverState === 'online_idle') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [driverState, pulseAnim]);

  // Handle countdown during incoming request
  useEffect(() => {
    if (driverState === 'incoming_request') {
      setCountdownSeconds(30);
      countdownProgress.setValue(1);

      Animated.timing(countdownProgress, {
        toValue: 0,
        duration: 30000,
        useNativeDriver: false,
      }).start();

      timerRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleDeclineJob();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [driverState]);

  // Online / Offline toggle
  const isOnline = driverState !== 'offline';

  const handleToggleOnline = (value: boolean) => {
    if (value) {
      setDriverState('online_idle');
    } else {
      if (
        driverState === 'en_route_pickup' ||
        driverState === 'at_pickup' ||
        driverState === 'in_transit' ||
        driverState === 'at_dropoff'
      ) {
        Alert.alert(
          'Active Trip in Progress',
          'Please complete or cancel your active delivery before going offline.'
        );
        return;
      }
      setDriverState('offline');
    }
  };

  // Trigger simulated incoming request
  const handleSimulateIncoming = () => {
    setPickupOtp('');
    setPickupOtpError('');
    setDeliveryPin('');
    setDeliveryPinError('');
    setPickupPhotoTaken(false);
    setDropoffPhotoTaken(false);
    setCustomerSigned(false);
    setDriverState('incoming_request');
  };

  const handleAcceptJob = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDriverState('en_route_pickup');
  };

  const handleDeclineJob = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDriverState('online_idle');
  };

  // Phase 1 -> Phase 2
  const handleArrivedAtPickup = () => {
    setDriverState('at_pickup');
  };

  // Phase 2 -> Phase 3
  const handleVerifyPickupOtp = () => {
    setPickupOtpError('');
    if (pickupOtp.trim() !== SAMPLE_JOB.expectedPickupOtp) {
      setPickupOtpError(`Incorrect OTP. Ask sender for code (${SAMPLE_JOB.expectedPickupOtp}).`);
      return;
    }
    if (!pickupPhotoTaken) {
      Alert.alert('POD Required', 'Please capture package inspection photo before starting transit.');
      return;
    }
    setIsVerifyingPickup(true);
    setTimeout(() => {
      setIsVerifyingPickup(false);
      setDriverState('in_transit');
    }, 700);
  };

  // Phase 3 -> Phase 4
  const handleArrivedAtDropoff = () => {
    setDriverState('at_dropoff');
  };

  // Phase 4 -> Phase 5
  const handleVerifyDeliveryPin = () => {
    setDeliveryPinError('');
    if (deliveryPin.trim() !== SAMPLE_JOB.expectedDeliveryPin) {
      setDeliveryPinError(`Incorrect PIN. Ask recipient for PIN (${SAMPLE_JOB.expectedDeliveryPin}).`);
      return;
    }
    if (!dropoffPhotoTaken && !customerSigned) {
      Alert.alert('Proof of Delivery', 'Please take doorstep photo or get customer signature.');
      return;
    }
    setIsVerifyingDelivery(true);
    setTimeout(() => {
      setIsVerifyingDelivery(false);
      setDriverState('payout_celebration');
    }, 700);
  };

  // Phase 5 -> Online Idle (Update earnings and trips)
  const handleFinishPayoutCelebration = () => {
    const tripRecord: TripRecord = {
      id: SAMPLE_JOB.id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      farePaise: SAMPLE_JOB.farePaise,
      pickup: SAMPLE_JOB.pickupAddress,
      dropoff: SAMPLE_JOB.dropoffAddress,
    };
    setTodayEarningsPaise((prev) => prev + SAMPLE_JOB.farePaise);
    setTodayTripsCount((prev) => prev + 1);
    setCompletedTrips((prev) => [tripRecord, ...prev]);

    setPickupOtp('');
    setDeliveryPin('');
    setDriverState('online_idle');
  };

  // Structured Cancellation Flow (Porter standard)
  const handleConfirmCancel = (reason: string) => {
    setShowCancelModal(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // If customer unreachable, award ₹50 waiting fee compensation
    if (reason.includes('unreachable') || reason.includes('refused')) {
      const compPaise = 5000; // ₹50.00
      setTodayEarningsPaise((prev) => prev + compPaise);
      Alert.alert(
        'Cancellation Processed',
        `Order cancelled due to "${reason}". ₹ 50.00 dry-run compensation has been credited to your wallet.`
      );
    } else {
      Alert.alert('Order Cancelled', `Order cancelled (${reason}). Returned to online queue.`);
    }

    setDriverState('online_idle');
  };

  const formattedTotalEarnings = (todayEarningsPaise / 100).toFixed(2);
  const formattedJobFare = (SAMPLE_JOB.farePaise / 100).toFixed(2);
  const formattedCodCash = (codCashInHandPaise / 100).toFixed(2);

  const makePhoneCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Phone Call', `Dialing ${phoneNumber}`);
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Operational Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logoTile}>
              <Image
                source={require('../../assets/images/emblem.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <View>
              <Text style={styles.eyebrow}>ATARASHI LOGISTICS</Text>
              <Text style={styles.title}>Driver Cockpit</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {/* Emergency SOS Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sosButton}
              onPress={() => setShowSosModal(true)}
            >
              <ShieldAlert size={16} color="#DC2626" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>

            {/* Notifications */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={styles.iconButton}
              onPress={() => Alert.alert('Notifications', 'No pending operational alerts.')}
            >
              <Bell size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 1. INCOMING REQUEST MODAL / SHEET                       */}
        {/* ======================================================== */}
        {driverState === 'incoming_request' && (
          <NeomorphCard style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestBadge}>
                <Sparkles size={14} color={colors.primaryDark} />
                <Text style={styles.requestBadgeText}>NEW DISPATCH ORDER</Text>
              </View>
              <View style={styles.countdownPill}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={styles.countdownText}>{countdownSeconds}s</Text>
              </View>
            </View>

            {/* Animated Countdown Progress Bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: countdownProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Earning & Vehicle Row */}
            <View style={styles.fareContainer}>
              <View>
                <Text style={styles.fareLabel}>GUARANTEED EARNING</Text>
                <Text style={styles.fareAmount}>₹ {formattedJobFare}</Text>
                <Text style={styles.fareSub}>Includes ₹50 Loading Helper Fee</Text>
              </View>
              <View style={styles.vehiclePill}>
                <Bike size={16} color={colors.dark} />
                <Text style={styles.vehicleText}>{SAMPLE_JOB.vehicle}</Text>
              </View>
            </View>

            {/* Porter Cargo Specifications */}
            <View style={styles.cargoSpecCard}>
              <View style={styles.cargoHeaderRow}>
                <Package size={16} color={colors.primaryDark} />
                <Text style={styles.cargoTitle}>{SAMPLE_JOB.packageCategory}</Text>
              </View>
              <View style={styles.cargoTagsRow}>
                <View style={styles.cargoTag}>
                  <Text style={styles.cargoTagText}>⚖️ {SAMPLE_JOB.weightKg} kg</Text>
                </View>
                <View style={styles.cargoTag}>
                  <Text style={styles.cargoTagText}>📏 {SAMPLE_JOB.dimensions}</Text>
                </View>
                <View style={styles.cargoTagHelper}>
                  <Text style={styles.cargoTagHelperText}>👷 Helper Included</Text>
                </View>
              </View>
              <Text style={styles.cargoNote}>{SAMPLE_JOB.specialInstructions}</Text>
            </View>

            {/* Route Details */}
            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <View style={styles.routeIconPickup}>
                  <MapPin size={15} color={colors.primaryDark} />
                </View>
                <View style={styles.routeInfo}>
                  <View style={styles.routeMetaRow}>
                    <Text style={styles.routeTag}>PICKUP POINT</Text>
                    <Text style={styles.routeDistance}>{SAMPLE_JOB.pickupDistance}</Text>
                  </View>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {SAMPLE_JOB.pickupAddress}
                  </Text>
                </View>
              </View>

              <View style={styles.routeConnector} />

              <View style={styles.routeRow}>
                <View style={styles.routeIconDropoff}>
                  <Navigation size={15} color={colors.dark} />
                </View>
                <View style={styles.routeInfo}>
                  <View style={styles.routeMetaRow}>
                    <Text style={styles.routeTag}>DROPOFF DESTINATION</Text>
                    <Text style={styles.routeDistance}>{SAMPLE_JOB.dropoffDistance}</Text>
                  </View>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {SAMPLE_JOB.dropoffAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.requestActionRow}>
              <PillButton
                title="Decline"
                variant="outline"
                size="md"
                style={styles.declineButton}
                onPress={handleDeclineJob}
              />
              <PillButton
                title="Accept Job"
                variant="dark"
                size="md"
                style={styles.acceptButton}
                icon={<ChevronRight size={18} color={colors.onDark} />}
                onPress={handleAcceptJob}
              />
            </View>
          </NeomorphCard>
        )}

        {/* ======================================================== */}
        {/* 2. ACTIVE DELIVERY COCKPIT (PHASES 1 TO 4)               */}
        {/* ======================================================== */}
        {(driverState === 'en_route_pickup' ||
          driverState === 'at_pickup' ||
          driverState === 'in_transit' ||
          driverState === 'at_dropoff') && (
          <View style={styles.cockpitContainer}>
            {/* Top Stepper Indicator */}
            <NeomorphCard style={styles.stepperCard}>
              <View style={styles.stepperRow}>
                <View
                  style={[
                    styles.stepBadge,
                    (driverState === 'en_route_pickup' ||
                      driverState === 'at_pickup' ||
                      driverState === 'in_transit' ||
                      driverState === 'at_dropoff') &&
                      styles.stepBadgeActive,
                  ]}
                >
                  <Text style={styles.stepNum}>1</Text>
                </View>
                <View
                  style={[
                    styles.stepLine,
                    (driverState === 'at_pickup' ||
                      driverState === 'in_transit' ||
                      driverState === 'at_dropoff') &&
                      styles.stepLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.stepBadge,
                    (driverState === 'at_pickup' ||
                      driverState === 'in_transit' ||
                      driverState === 'at_dropoff') &&
                      styles.stepBadgeActive,
                  ]}
                >
                  <Text style={styles.stepNum}>2</Text>
                </View>
                <View
                  style={[
                    styles.stepLine,
                    (driverState === 'in_transit' || driverState === 'at_dropoff') &&
                      styles.stepLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.stepBadge,
                    (driverState === 'in_transit' || driverState === 'at_dropoff') &&
                      styles.stepBadgeActive,
                  ]}
                >
                  <Text style={styles.stepNum}>3</Text>
                </View>
                <View
                  style={[
                    styles.stepLine,
                    driverState === 'at_dropoff' && styles.stepLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.stepBadge,
                    driverState === 'at_dropoff' && styles.stepBadgeActive,
                  ]}
                >
                  <Text style={styles.stepNum}>4</Text>
                </View>
              </View>

              <View style={styles.stepLabelRow}>
                <Text style={styles.stepLabelText}>To Pickup</Text>
                <Text style={styles.stepLabelText}>Inspect & OTP</Text>
                <Text style={styles.stepLabelText}>In Transit</Text>
                <Text style={styles.stepLabelText}>PIN & Sign</Text>
              </View>
            </NeomorphCard>

            {/* LIVE TACTILE VECTOR MAP WITH REAL-TIME NAVIGATION HUD */}
            <TactileMap
              isEnRoute={driverState === 'en_route_pickup' || driverState === 'at_pickup'}
              pickupLabel={SAMPLE_JOB.pickupAddress}
              dropoffLabel={SAMPLE_JOB.dropoffAddress}
              distanceKm={driverState === 'en_route_pickup' ? 1.2 : 4.8}
              durationMins={driverState === 'en_route_pickup' ? 4 : 14}
              showSurgeZones={false}
              height={230}
            />

            {/* PHASE 1: EN ROUTE TO PICKUP */}
            {driverState === 'en_route_pickup' && (
              <NeomorphCard style={styles.phaseCard}>
                <View style={styles.phaseHeaderRow}>
                  <View style={styles.phaseBadgeMint}>
                    <Navigation size={13} color={colors.primaryDark} />
                    <Text style={styles.phaseBadgeMintText}>EN ROUTE TO PICKUP</Text>
                  </View>
                  <Text style={styles.jobId}>Job #{SAMPLE_JOB.id}</Text>
                </View>

                <Text style={styles.destinationTitle}>Pickup from {SAMPLE_JOB.senderName}</Text>
                <Text style={styles.destinationSub}>
                  {SAMPLE_JOB.pickupDistance} • Approx 4 mins away
                </Text>

                <View style={styles.infoTile}>
                  <MapPin size={18} color={colors.primaryDark} style={styles.tileIcon} />
                  <View style={styles.tileInfo}>
                    <Text style={styles.tileLabel}>PICKUP ADDRESS</Text>
                    <Text style={styles.tileValue}>{SAMPLE_JOB.pickupAddress}</Text>
                  </View>
                </View>

                {/* Porter Communication Action Row */}
                <View style={styles.contactRow}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{SAMPLE_JOB.senderName}</Text>
                    <Text style={styles.contactPhone}>{SAMPLE_JOB.senderPhone}</Text>
                  </View>
                  <View style={styles.commsBtnGroup}>
                    <TouchableOpacity
                      style={styles.chatIconBtn}
                      onPress={() => setShowChatModal(true)}
                    >
                      <MessageSquare size={16} color={colors.primaryDark} />
                    </TouchableOpacity>
                    <PillButton
                      title="Call"
                      variant="secondary"
                      size="sm"
                      icon={<Phone size={14} color={colors.dark} />}
                      iconPosition="left"
                      onPress={() => makePhoneCall(SAMPLE_JOB.senderPhone)}
                    />
                  </View>
                </View>

                {/* Cargo Details Card */}
                <View style={styles.cargoMiniTile}>
                  <Package size={15} color={colors.textSecondary} />
                  <Text style={styles.cargoMiniText}>
                    {SAMPLE_JOB.packageCategory} ({SAMPLE_JOB.weightKg} kg) • 👷 Helper req.
                  </Text>
                </View>

                <PillButton
                  title="Arrived at Pickup"
                  variant="dark"
                  size="lg"
                  style={styles.mainActionButton}
                  onPress={handleArrivedAtPickup}
                />

                {/* Structured Cancel Link */}
                <TouchableOpacity
                  style={styles.cancelLinkBox}
                  onPress={() => setShowCancelModal(true)}
                >
                  <Text style={styles.cancelLinkText}>Need to cancel order?</Text>
                </TouchableOpacity>
              </NeomorphCard>
            )}

            {/* PHASE 2: AT PICKUP & INSPECT PACKAGE + OTP */}
            {driverState === 'at_pickup' && (
              <NeomorphCard style={styles.phaseCard}>
                <View style={styles.phaseHeaderRow}>
                  <View style={styles.phaseBadgeMint}>
                    <ShieldCheck size={13} color={colors.primaryDark} />
                    <Text style={styles.phaseBadgeMintText}>AT PICKUP LOCATION</Text>
                  </View>
                  <Text style={styles.jobId}>Job #{SAMPLE_JOB.id}</Text>
                </View>

                <Text style={styles.destinationTitle}>Inspect & Verify Custody</Text>
                <Text style={styles.destinationSub}>
                  Inspect parcel seal, snap inspection photo, and enter 4-digit pickup code.
                </Text>

                {/* Proof of Delivery (POD): Pickup Inspection Photo */}
                <View style={styles.podCard}>
                  <View style={styles.podLeft}>
                    <View style={[styles.podIconCircle, pickupPhotoTaken && styles.podIconCircleDone]}>
                      {pickupPhotoTaken ? (
                        <Check size={18} color="#FFFFFF" />
                      ) : (
                        <Camera size={18} color={colors.dark} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.podTitle}>Package Inspection Photo</Text>
                      <Text style={styles.podSub}>
                        {pickupPhotoTaken ? 'Photo captured & verified ✓' : 'Mandatory before loading'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.podActionBtn, pickupPhotoTaken && styles.podActionBtnDone]}
                    onPress={() => {
                      setPickupPhotoTaken(!pickupPhotoTaken);
                      if (!pickupPhotoTaken) {
                        Alert.alert('Camera Capture', 'Simulated parcel seal photo captured and saved to trip audit log.');
                      }
                    }}
                  >
                    <Text style={[styles.podActionText, pickupPhotoTaken && styles.podActionTextDone]}>
                      {pickupPhotoTaken ? 'Retake' : 'Capture'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Demo Helper */}
                <View style={styles.demoHelperPill}>
                  <Text style={styles.demoHelperText}>
                    Demo Test Code: <Text style={styles.demoBold}>{SAMPLE_JOB.expectedPickupOtp}</Text>
                  </Text>
                  <Pressable
                    onPress={() => setPickupOtp(SAMPLE_JOB.expectedPickupOtp)}
                    style={styles.demoQuickBtn}
                  >
                    <Text style={styles.demoQuickBtnText}>Auto-Fill</Text>
                  </Pressable>
                </View>

                <Input
                  label="4-Digit Pickup OTP"
                  value={pickupOtp}
                  onChangeText={(val) => {
                    setPickupOtp(val);
                    if (pickupOtpError) setPickupOtpError('');
                  }}
                  placeholder="e.g. 5821"
                  keyboardType="number-pad"
                  maxLength={4}
                  prefix={<KeyRound size={18} color={colors.textSecondary} />}
                  error={pickupOtpError}
                  containerStyle={styles.otpInputContainer}
                />

                <PillButton
                  title="Verify & Start Delivery"
                  variant="primary"
                  size="lg"
                  loading={isVerifyingPickup}
                  disabled={pickupOtp.length < 4}
                  style={styles.mainActionButton}
                  onPress={handleVerifyPickupOtp}
                />

                <TouchableOpacity
                  style={styles.cancelLinkBox}
                  onPress={() => setShowCancelModal(true)}
                >
                  <Text style={styles.cancelLinkText}>Issue at pickup? Cancel order</Text>
                </TouchableOpacity>
              </NeomorphCard>
            )}

            {/* PHASE 3: OUT FOR DELIVERY (IN TRANSIT) */}
            {driverState === 'in_transit' && (
              <NeomorphCard style={styles.phaseCard}>
                <View style={styles.phaseHeaderRow}>
                  <View style={styles.phaseBadgeMint}>
                    <Bike size={13} color={colors.primaryDark} />
                    <Text style={styles.phaseBadgeMintText}>OUT FOR DELIVERY</Text>
                  </View>
                  <Text style={styles.jobId}>Job #{SAMPLE_JOB.id}</Text>
                </View>

                <Text style={styles.destinationTitle}>Deliver to {SAMPLE_JOB.recipientName}</Text>
                <Text style={styles.destinationSub}>
                  {SAMPLE_JOB.dropoffDistance} • Approx 14 mins away
                </Text>

                <View style={styles.infoTile}>
                  <MapPin size={18} color={colors.dark} style={styles.tileIcon} />
                  <View style={styles.tileInfo}>
                    <Text style={styles.tileLabel}>DELIVERY ADDRESS</Text>
                    <Text style={styles.tileValue}>{SAMPLE_JOB.dropoffAddress}</Text>
                  </View>
                </View>

                {/* Recipient Comms */}
                <View style={styles.contactRow}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{SAMPLE_JOB.recipientName}</Text>
                    <Text style={styles.contactPhone}>{SAMPLE_JOB.recipientPhone}</Text>
                  </View>
                  <View style={styles.commsBtnGroup}>
                    <TouchableOpacity
                      style={styles.chatIconBtn}
                      onPress={() => setShowChatModal(true)}
                    >
                      <MessageSquare size={16} color={colors.primaryDark} />
                    </TouchableOpacity>
                    <PillButton
                      title="Call Customer"
                      variant="secondary"
                      size="sm"
                      icon={<Phone size={14} color={colors.dark} />}
                      iconPosition="left"
                      onPress={() => makePhoneCall(SAMPLE_JOB.recipientPhone)}
                    />
                  </View>
                </View>

                <View style={styles.securityNote}>
                  <ShieldCheck size={14} color={colors.primaryDark} />
                  <Text style={styles.securityNoteText}>
                    Active transit tracking enabled. Follow traffic guidelines!
                  </Text>
                </View>

                <PillButton
                  title="Arrived at Dropoff"
                  variant="dark"
                  size="lg"
                  style={styles.mainActionButton}
                  onPress={handleArrivedAtDropoff}
                />
              </NeomorphCard>
            )}

            {/* PHASE 4: DELIVERY CONFIRMATION (PIN + POD) */}
            {driverState === 'at_dropoff' && (
              <NeomorphCard style={styles.phaseCard}>
                <View style={styles.phaseHeaderRow}>
                  <View style={styles.phaseBadgeMint}>
                    <CheckCircle2 size={13} color={colors.primaryDark} />
                    <Text style={styles.phaseBadgeMintText}>FINAL HANDOVER & POD</Text>
                  </View>
                  <Text style={styles.jobId}>Job #{SAMPLE_JOB.id}</Text>
                </View>

                <Text style={styles.destinationTitle}>Confirm Handover</Text>
                <Text style={styles.destinationSub}>
                  Collect recipient PIN and snap handover photo or digital sign.
                </Text>

                {/* Proof of Delivery POD Options */}
                <View style={styles.podDualGrid}>
                  {/* Doorstep Photo */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.podGridTile, dropoffPhotoTaken && styles.podGridTileActive]}
                    onPress={() => {
                      setDropoffPhotoTaken(!dropoffPhotoTaken);
                      if (!dropoffPhotoTaken) {
                        Alert.alert('POD Camera', 'Simulated doorstep handover photo captured.');
                      }
                    }}
                  >
                    <Camera size={20} color={dropoffPhotoTaken ? colors.primaryDark : colors.textSecondary} />
                    <Text style={styles.podGridTitle}>Doorstep Photo</Text>
                    <Text style={styles.podGridStatus}>
                      {dropoffPhotoTaken ? 'Captured ✓' : 'Tap to take'}
                    </Text>
                  </TouchableOpacity>

                  {/* Customer Signature */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.podGridTile, customerSigned && styles.podGridTileActive]}
                    onPress={() => {
                      setCustomerSigned(!customerSigned);
                      if (!customerSigned) {
                        Alert.alert('Digital Sign', 'Customer signed on device glass.');
                      }
                    }}
                  >
                    <FileCheck size={20} color={customerSigned ? colors.primaryDark : colors.textSecondary} />
                    <Text style={styles.podGridTitle}>Customer Sign</Text>
                    <Text style={styles.podGridStatus}>
                      {customerSigned ? 'Signed ✓' : 'Tap to sign'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* PIN Code Input */}
                <View style={styles.demoHelperPill}>
                  <Text style={styles.demoHelperText}>
                    Demo Recipient PIN: <Text style={styles.demoBold}>{SAMPLE_JOB.expectedDeliveryPin}</Text>
                  </Text>
                  <Pressable
                    onPress={() => setDeliveryPin(SAMPLE_JOB.expectedDeliveryPin)}
                    style={styles.demoQuickBtn}
                  >
                    <Text style={styles.demoQuickBtnText}>Auto-Fill</Text>
                  </Pressable>
                </View>

                <Input
                  label="4-Digit Recipient PIN"
                  value={deliveryPin}
                  onChangeText={(val) => {
                    setDeliveryPin(val);
                    if (deliveryPinError) setDeliveryPinError('');
                  }}
                  placeholder="e.g. 9412"
                  keyboardType="number-pad"
                  maxLength={4}
                  prefix={<KeyRound size={18} color={colors.textSecondary} />}
                  error={deliveryPinError}
                  containerStyle={styles.otpInputContainer}
                />

                <View style={styles.paymentNotice}>
                  <Text style={styles.paymentNoticeLabel}>PAYMENT STATUS</Text>
                  <Text style={styles.paymentNoticeValue}>Prepaid Online • No cash to collect</Text>
                </View>

                <PillButton
                  title="Complete Delivery"
                  variant="primary"
                  size="lg"
                  loading={isVerifyingDelivery}
                  disabled={deliveryPin.length < 4}
                  style={styles.mainActionButton}
                  onPress={handleVerifyDeliveryPin}
                />
              </NeomorphCard>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* 3. PHASE 5: PAYOUT CELEBRATION SHEET                     */}
        {/* ======================================================== */}
        {driverState === 'payout_celebration' && (
          <NeomorphCard variant="mint" style={styles.celebrationCard}>
            <View style={styles.celebrationIconContainer}>
              <CircleCheck size={48} color={colors.primaryDark} />
            </View>

            <Text style={styles.celebrationTitle}>Trip Completed!</Text>
            <Text style={styles.celebrationAmount}>₹ {formattedJobFare}</Text>
            <Text style={styles.celebrationSubtitle}>
              Credited directly to your driver wallet
            </Text>

            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Fare</Text>
                <Text style={styles.breakdownVal}>₹ 80.00</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Distance (4.8 km)</Text>
                <Text style={styles.breakdownVal}>₹ 85.00</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Loading/Unloading Labour</Text>
                <Text style={styles.breakdownVal}>₹ 50.00</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total Credited</Text>
                <Text style={styles.breakdownTotalVal}>₹ {formattedJobFare}</Text>
              </View>
            </View>

            <PillButton
              title="Return to Online Queue"
              variant="dark"
              size="lg"
              style={styles.celebrationButton}
              onPress={handleFinishPayoutCelebration}
            />
          </NeomorphCard>
        )}

        {/* ======================================================== */}
        {/* 4. DEFAULT HOME & SHIFT VIEW (OFFLINE / ONLINE IDLE)     */}
        {/* ======================================================== */}
        {(driverState === 'offline' || driverState === 'online_idle') && (
          <>
            {/* Status Card */}
            <NeomorphCard style={styles.statusCard}>
              <View style={styles.statusTop}>
                <View>
                  <Text style={styles.cardEyebrow}>DRIVER STATUS</Text>
                  <Text style={styles.statusTitle}>
                    {isOnline ? 'You’re online' : 'You’re offline'}
                  </Text>
                </View>
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={isOnline ? colors.dark : colors.surface}
                  accessibilityLabel="Go online or offline"
                />
              </View>

              <Text style={styles.statusCopy}>
                {isOnline
                  ? 'You are active in the central Bangalore dispatch grid.'
                  : 'Go online when you’re ready to receive delivery jobs.'}
              </Text>

              <View style={styles.divider} />

              <View style={styles.statusFoot}>
                <View style={styles.liveDotWrapper}>
                  {isOnline && (
                    <Animated.View
                      style={[
                        styles.liveDotPulse,
                        { transform: [{ scale: pulseAnim }], opacity: 0.4 },
                      ]}
                    />
                  )}
                  <View style={[styles.liveDot, isOnline && styles.liveDotOn]} />
                </View>
                <Text style={styles.statusFootText}>
                  {isOnline ? 'Scanning for nearby jobs • GPS active' : 'No active dispatch'}
                </Text>
              </View>

              {/* Simulation Trigger Button when Online */}
              {isOnline && (
                <View style={styles.simContainer}>
                  <PillButton
                    title="Simulate Incoming Request"
                    variant="primary"
                    size="md"
                    icon={<Sparkles size={16} color={colors.dark} />}
                    iconPosition="left"
                    onPress={handleSimulateIncoming}
                  />
                </View>
              )}
            </NeomorphCard>

            {/* Segment Tabs for Driver Overview */}
            <View style={styles.tabsWrapper}>
              <PillTabs
                tabs={[
                  { key: 'shift', label: 'Shift' },
                  { key: 'earnings', label: 'Wallet & COD' },
                  { key: 'trips', label: 'History', count: todayTripsCount },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </View>

            {/* TAB: SHIFT */}
            {activeTab === 'shift' && (
              <>
                {/* Live Area Map & Surge Hotspots */}
                {isOnline && (
                  <View style={styles.mapSection}>
                    <View style={styles.mapSectionHeader}>
                      <View style={styles.mapTitleRow}>
                        <Layers size={14} color={colors.primaryDark} />
                        <Text style={styles.mapTitle}>Live Grid & Demand Map</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.surgeToggleBtn}
                        onPress={() => setShowSurgeZones(!showSurgeZones)}
                      >
                        <Text style={styles.surgeToggleText}>
                          {showSurgeZones ? '⚡ Surge: ON' : 'Surge: OFF'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TactileMap
                      isEnRoute={false}
                      pickupLabel="Koramangala 4th Block"
                      dropoffLabel="Indiranagar 100ft Rd"
                      distanceKm={2.4}
                      durationMins={8}
                      showSurgeZones={showSurgeZones}
                      height={190}
                    />
                  </View>
                )}

                {/* Today's Earnings Snapshot */}
                <NeomorphCard variant="mint" style={styles.earnings}>
                  <View style={styles.earningsHeading}>
                    <View style={styles.earningsTitleRow}>
                      <IndianRupee size={16} color={colors.primaryDark} />
                      <Text style={styles.earningsTitle}>Today’s earnings</Text>
                    </View>
                    <View style={styles.periodPill}>
                      <Text style={styles.period}>TODAY</Text>
                    </View>
                  </View>
                  <Text style={styles.amount}>
                    ₹ {Math.floor(todayEarningsPaise / 100)}
                    <Text style={styles.amountDecimal}>
                      .{String(todayEarningsPaise % 100).padStart(2, '0')}
                    </Text>
                  </Text>
                  <Text style={styles.earningsNote}>
                    {todayTripsCount > 0
                      ? `${todayTripsCount} ${todayTripsCount === 1 ? 'trip' : 'trips'} completed today.`
                      : 'Your completed trips will show here.'}
                  </Text>
                  <View style={styles.earningsBottom}>
                    <View>
                      <Text style={styles.metric}>{todayTripsCount}</Text>
                      <Text style={styles.metricLabel}>TRIPS</Text>
                    </View>
                    <View style={styles.metricRule} />
                    <View>
                      <Text style={styles.metric}>₹ 0</Text>
                      <Text style={styles.metricLabel}>CASH COLLECTED</Text>
                    </View>
                    <View style={styles.metricRule} />
                    <View>
                      <Text style={styles.metric}>4.9 ★</Text>
                      <Text style={styles.metricLabel}>RATING</Text>
                    </View>
                  </View>
                </NeomorphCard>

                {/* Driver Setup / Vehicle Card */}
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Vehicle & Gear</Text>
                  <Text style={styles.link}>Manage</Text>
                </View>

                <TactileCard
                  onPress={() =>
                    Alert.alert('Vehicle Status', 'Hero Electric Optima: 84% Battery • All permits valid.')
                  }
                  style={styles.checklistCard}
                  accessibilityLabel="Vehicle status"
                >
                  <View style={styles.iconTile}>
                    <Bike size={20} color={colors.primaryDark} />
                  </View>
                  <View style={styles.checkCopy}>
                    <Text style={styles.checkTitle}>Hero Electric Optima (KA-01-EQ-4421)</Text>
                    <Text style={styles.checkBody}>84% Battery • 68 km range • Delivery Box Mounted</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TactileCard>

                <TactileCard
                  onPress={() =>
                    Alert.alert(
                      'Driver Guidelines',
                      'Porter Protocol: Always inspect carton seal before OTP and wear helmet.'
                    )
                  }
                  style={[styles.checklistCard, { marginTop: 10 }]}
                  accessibilityLabel="Safety guidelines"
                >
                  <View style={styles.iconTile}>
                    <ClipboardCheck size={20} color={colors.primaryDark} />
                  </View>
                  <View style={styles.checkCopy}>
                    <Text style={styles.checkTitle}>Porter Safety & Cargo Rules</Text>
                    <Text style={styles.checkBody}>Verify OTP on pickup, inspect package seal, wear helmet.</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TactileCard>
              </>
            )}

            {/* TAB: WALLET & COD */}
            {activeTab === 'earnings' && (
              <View style={styles.tabContainer}>
                {/* Available Balance Card */}
                <NeomorphCard style={styles.earningsDetailCard}>
                  <Text style={styles.detailHeader}>Driver Wallet</Text>
                  <Text style={styles.detailSub}>Instant UPI cashout enabled</Text>

                  <View style={styles.walletTile}>
                    <Text style={styles.walletBalanceLabel}>WITHDRAWABLE BALANCE</Text>
                    <Text style={styles.walletBalanceVal}>₹ {formattedTotalEarnings}</Text>
                  </View>

                  <PillButton
                    title="Cashout to UPI / Bank"
                    variant="dark"
                    size="md"
                    style={styles.withdrawBtn}
                    onPress={() =>
                      Alert.alert(
                        'Instant Cashout',
                        `₹ ${formattedTotalEarnings} will be transferred to your linked UPI VPA: driver@okhdfcbank.`
                      )
                    }
                  />
                </NeomorphCard>

                {/* Porter COD Cash Collection Ledger */}
                <NeomorphCard style={styles.codCard}>
                  <View style={styles.codHeader}>
                    <View style={styles.codIconBox}>
                      <IndianRupee size={16} color="#059669" />
                    </View>
                    <View>
                      <Text style={styles.codTitle}>Cash on Delivery (COD) In Hand</Text>
                      <Text style={styles.codSub}>Limit: ₹ 5,000.00 max cash held</Text>
                    </View>
                  </View>

                  <Text style={styles.codAmount}>₹ {formattedCodCash}</Text>

                  <View style={styles.codDivider} />

                  <PillButton
                    title="Deposit Cash via UPI"
                    variant="outline"
                    size="sm"
                    onPress={() =>
                      Alert.alert('Deposit Cash', 'Remit collected customer cash back to company account.')
                    }
                  />
                </NeomorphCard>
              </View>
            )}

            {/* TAB: TRIPS HISTORY */}
            {activeTab === 'trips' && (
              <NeomorphCard style={styles.tripsCard}>
                <Text style={styles.detailHeader}>Today's Completed Trips</Text>
                {completedTrips.length === 0 ? (
                  <View style={styles.emptyTripsBox}>
                    <Package size={32} color={colors.textMuted} />
                    <Text style={styles.emptyTripsTitle}>No trips completed yet</Text>
                    <Text style={styles.emptyTripsSub}>
                      Turn on your availability to start accepting delivery requests.
                    </Text>
                  </View>
                ) : (
                  completedTrips.map((trip, idx) => (
                    <View key={idx} style={styles.tripItemRow}>
                      <View style={styles.tripItemLeft}>
                        <View style={styles.tripItemDot} />
                        <View>
                          <Text style={styles.tripItemId}>Trip #{trip.id} • {trip.time}</Text>
                          <Text style={styles.tripItemAddress} numberOfLines={1}>
                            {trip.dropoff}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.tripItemFare}>
                        +₹ {(trip.farePaise / 100).toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </NeomorphCard>
            )}

            <Text style={styles.footer}>Drive safely with Atarashi Logistics.</Text>
          </>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* 5. FLOATING EMERGENCY SOS MODAL                          */}
      {/* ======================================================== */}
      <Modal visible={showSosModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.sosModalContent}>
            <View style={styles.sosModalIcon}>
              <ShieldAlert size={36} color="#DC2626" />
            </View>
            <Text style={styles.sosModalTitle}>Emergency SOS Assistance</Text>
            <Text style={styles.sosModalBody}>
              Your live GPS coordinates (12.9352° N, 77.6245° E) will be broadcasted directly to the
              Atarashi Logistics 24/7 Security Desk and local authorities.
            </Text>

            <TouchableOpacity
              style={styles.sosConfirmBtn}
              onPress={() => {
                setShowSosModal(false);
                Linking.openURL('tel:112').catch(() =>
                  Alert.alert('Emergency Call', 'Dialing 112 Police Helpline.')
                );
              }}
            >
              <Text style={styles.sosConfirmText}>Dial 112 Emergency Police</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sosFleetBtn}
              onPress={() => {
                setShowSosModal(false);
                Alert.alert('Fleet Security Desk', 'Alert dispatched. Fleet officer is calling you back.');
              }}
            >
              <Text style={styles.sosFleetText}>Alert Logistics Fleet Desk</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSosModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 6. STRUCTURED CANCELLATION MODAL (PORTER STANDARDS)     */}
      {/* ======================================================== */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Select Cancellation Reason</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelModalSub}>
              Cancellations due to customer issues include a ₹50 compensation payout.
            </Text>

            {[
              'Customer unreachable / phone off (>10 min wait)',
              'Package exceeds vehicle size or weight limit',
              'Customer refused to pay labour / helper charges',
              'Prohibited or hazardous materials found',
              'Vehicle puncture or mechanical breakdown',
            ].map((reason, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.reasonTile}
                onPress={() => handleConfirmCancel(reason)}
              >
                <AlertTriangle size={16} color="#D97706" />
                <Text style={styles.reasonText}>{reason}</Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 7. QUICK CANNED CHAT MODAL                              */}
      {/* ======================================================== */}
      <Modal visible={showChatModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Quick Customer Chat</Text>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelModalSub}>
              Send standard quick update to {SAMPLE_JOB.senderName}:
            </Text>

            {[
              'I have arrived at the pickup location.',
              'Please share the 4-digit pickup OTP.',
              'Please bring the parcel down to the vehicle.',
              'Running 5 mins late due to heavy traffic delay.',
            ].map((msg, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.reasonTile}
                onPress={() => {
                  setShowChatModal(false);
                  Alert.alert('Message Sent', `Sent to customer: "${msg}"`);
                }}
              >
                <MessageSquare size={16} color={colors.primaryDark} />
                <Text style={styles.reasonText}>{msg}</Text>
                <Check size={16} color={colors.primaryHover} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg - 2,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoTile: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  logo: {
    width: 28,
    height: 28,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: sizes.lg,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  sosText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },

  // Status Card
  statusCard: {
    padding: 19,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: sizes.xl - 2,
    fontWeight: '700',
    marginTop: 7,
  },
  statusCopy: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 260,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 13,
  },
  statusFoot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDotWrapper: {
    position: 'relative',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  liveDotOn: {
    backgroundColor: colors.success,
  },
  liveDotPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  statusFootText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  simContainer: {
    marginTop: 16,
  },

  // Tabs
  tabsWrapper: {
    marginTop: 16,
    marginBottom: 8,
  },
  tabContainer: {
    gap: 12,
  },

  // Map Section
  mapSection: {
    marginTop: 6,
    marginBottom: 8,
  },
  mapSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  surgeToggleBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  surgeToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },

  // Earnings
  earnings: {
    marginTop: 8,
    padding: 19,
  },
  earningsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earningsTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  periodPill: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  period: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    marginTop: 16,
  },
  amountDecimal: {
    fontSize: 20,
  },
  earningsNote: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  earningsBottom: {
    borderTopWidth: 1,
    borderColor: 'rgba(110, 231, 135, 0.4)',
    marginTop: 17,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metric: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 4,
  },
  metricRule: {
    height: 28,
    width: 1,
    backgroundColor: 'rgba(110, 231, 135, 0.4)',
  },

  // Checklist / Vehicle Card
  sectionRow: {
    marginTop: spacing.lg,
    marginBottom: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: sizes.md - 1,
    fontWeight: '700',
  },
  link: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  checklistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCopy: {
    flex: 1,
    marginHorizontal: 11,
  },
  checkTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  checkBody: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  // 1. INCOMING REQUEST STYLES
  requestCard: {
    padding: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
  },
  requestBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countdownText: {
    color: colors.dark,
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primaryHover,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fareLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  fareAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  fareSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryDark,
    marginTop: 2,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark,
  },
  cargoSpecCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cargoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cargoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cargoTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cargoTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  cargoTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cargoTagHelper: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cargoTagHelperText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  cargoNote: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  routeBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconPickup: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconDropoff: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeConnector: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginLeft: 15,
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  routeDistance: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  routeAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  requestActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  declineButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 2,
  },

  // 2. ACTIVE DELIVERY COCKPIT
  cockpitContainer: {
    gap: 14,
  },
  stepperCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryHover,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  stepLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Phase Cards
  phaseCard: {
    padding: 20,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseBadgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
  },
  phaseBadgeMintText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  jobId: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  destinationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
  },
  destinationSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 3,
  },
  infoTile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  tileIcon: {
    marginTop: 2,
  },
  tileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  tileValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 3,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  commsBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cargoMiniTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  cargoMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  mainActionButton: {
    marginTop: 18,
    width: '100%',
  },
  cancelLinkBox: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  cancelLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Proof of Delivery (POD) Styles
  podCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF8',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8E2',
    marginTop: 14,
  },
  podLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  podIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podIconCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  podTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  podSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  podActionBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  podActionBtnDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  podActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark,
  },
  podActionTextDone: {
    color: '#059669',
  },
  podDualGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  podGridTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  podGridTileActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  podGridTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  podGridStatus: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  otpInputContainer: {
    marginTop: 14,
  },
  demoHelperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  demoHelperText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  demoBold: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
  demoQuickBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  demoQuickBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: theme.radius.md,
  },
  securityNoteText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
  },
  paymentNotice: {
    marginTop: 14,
    padding: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentNoticeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  paymentNoticeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 3,
  },

  // 3. PAYOUT CELEBRATION STYLES
  celebrationCard: {
    padding: 24,
    alignItems: 'center',
  },
  celebrationIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glowGreen,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 14,
  },
  celebrationAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 6,
  },
  celebrationSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  breakdownBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 135, 0.4)',
    ...theme.shadows.card,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark,
  },
  breakdownTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  celebrationButton: {
    width: '100%',
    marginTop: 20,
  },

  // Wallet & COD Tabs
  earningsDetailCard: {
    padding: 20,
  },
  detailHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  walletTile: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  walletBalanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  walletBalanceVal: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  withdrawBtn: {
    marginTop: 14,
    width: '100%',
  },
  codCard: {
    padding: 18,
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  codHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  codSub: {
    fontSize: 10,
    color: '#047857',
  },
  codAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#065F46',
    marginTop: 10,
  },
  codDivider: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: 12,
  },

  tripsCard: {
    padding: 20,
    marginTop: 8,
  },
  emptyTripsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTripsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptyTripsSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 220,
  },
  tripItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tripItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  tripItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryHover,
    marginRight: 10,
  },
  tripItemId: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tripItemAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  tripItemFare: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 28,
  },

  // Modals Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sosModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  sosModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sosModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
  },
  sosModalBody: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  sosConfirmBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 9999,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  sosConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sosFleetBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  sosFleetText: {
    color: '#111813',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCloseBtn: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  cancelModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cancelModalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  reasonTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
