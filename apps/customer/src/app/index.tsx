import type { Coordinates, VehicleType } from '@atarashi/domain';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Bike,
  Building2,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  Crosshair,
  FileText,
  Home,
  Info,
  MapPin,
  MessageSquare,
  Package,
  Percent,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  User,
  Wallet,
  Warehouse,
  X,
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { NeomorphCard } from '@/components/ui/neomorph-card';
import { PillButton } from '@/components/ui/pill-button';
import { PillTabs } from '@/components/ui/pill-tabs';
import { LocationPickerModal } from '@/components/location-picker-modal';
import { SlideToConfirm } from '@/components/slide-to-confirm';
import { B2BGSTINModal } from '@/components/b2b-gstin-modal';
import { MultiStopRouteCard, RouteStop } from '@/components/multi-stop-route-card';
import { LoadingBufferPill } from '@/components/loading-buffer-pill';
import { PackersMoversModal } from '@/components/packers-movers-modal';
import { BottomNavigationBar, CustomerNavigationTab } from '@/components/bottom-navigation-bar';
import { TactileCard } from '@/components/ui/tactile-card';
import { TactileMap } from '@/components/ui/tactile-map';
import { api } from '@/lib/api';
import { theme } from '@/theme/theme';

const { colors, spacing, sizes } = theme;

// ==========================================
// Types & Domain Constants
// ==========================================

export type CustomerState =
  | 'explore_quote'
  | 'booking_sheet'
  | 'finding_driver'
  | 'active_tracking'
  | 'delivery_completed';

export type OverviewTab = 'send_parcel' | 'saved_places' | 'wallet_passes';

export type PaymentMethod = 'cod' | 'online' | 'wallet';

export type DeliveryStep =
  | 'driver_assigned'
  | 'package_picked_up'
  | 'in_transit'
  | 'delivered';

export interface VehicleOption {
  type: VehicleType;
  title: string;
  subtitle: string;
  maxWeightKg: number;
  baseFarePaise: number; // Integer paise
  etaMins: number;
  icon: (color: string) => React.ReactNode;
}

const VEHICLE_CATALOG: VehicleOption[] = [
  {
    type: 'bike',
    title: 'Bike Express',
    subtitle: 'Small parcels & documents',
    maxWeightKg: 20,
    baseFarePaise: 18500, // ₹ 185.00
    etaMins: 4,
    icon: (c) => <Bike size={22} color={c} />,
  },
  {
    type: 'auto',
    title: 'Auto Freight',
    subtitle: 'Medium cartons & electronics',
    maxWeightKg: 100,
    baseFarePaise: 24000, // ₹ 240.00
    etaMins: 6,
    icon: (c) => <Package size={22} color={c} />,
  },
  {
    type: 'car',
    title: 'Car Courier',
    subtitle: 'Fragile goods & boxed deliveries',
    maxWeightKg: 250,
    baseFarePaise: 32000, // ₹ 320.00
    etaMins: 8,
    icon: (c) => <Car size={22} color={c} />,
  },
  {
    type: 'pickup',
    title: 'Pickup Truck',
    subtitle: 'Bulky cargo & industrial supplies',
    maxWeightKg: 750,
    baseFarePaise: 48000, // ₹ 480.00
    etaMins: 12,
    icon: (c) => <Truck size={22} color={c} />,
  },
];

const CARGO_CATEGORIES = [
  'Electronics & Gadgets',
  'Documents / Books',
  'Food / Groceries',
  'Apparel / Textiles',
  'Industrial / Hardware',
];

const CANCEL_REASONS = [
  'Driver taking longer than estimated',
  'Selected wrong vehicle or parcel category',
  'Need to change pickup or dropoff address',
  'Recipient requested delivery rescheduling',
  'Booked by mistake',
];

const CHAT_PRESETS = [
  "I'm at the pickup point downstairs",
  'Please take the service elevator to 4th floor',
  'Package is fragile, handle with care',
  'Will share pickup OTP when you arrive',
];

// Helper: Formats integer paise into clean Rupees string
function formatPaise(paise: number): string {
  const rupees = (paise / 100).toFixed(2);
  return `₹ ${rupees}`;
}

export default function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();

  // Navigation / Phase State
  const [customerState, setCustomerState] = useState<CustomerState>('explore_quote');
  const [dispatchStep, setDispatchStep] = useState<'route' | 'vehicles'>('route');
  const [navTab, setNavTab] = useState<CustomerNavigationTab>('dispatch');
  const [serviceMode, setServiceMode] = useState<'parcel' | 'freight' | 'shifting'>('parcel');
  const [showFarePolicyModal, setShowFarePolicyModal] = useState(false);

  // Booking Configuration State
  const [pickupAddress, setPickupAddress] = useState('Indiranagar 100ft Road, Bengaluru');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>({ latitude: 12.9716, longitude: 77.5946 });
  const [dropoffAddress, setDropoffAddress] = useState('Koramangala 4th Block, Bengaluru');
  const [dropoffCoords, setDropoffCoords] = useState<Coordinates>({ latitude: 12.9352, longitude: 77.6245 });
  const [distanceKm, setDistanceKm] = useState(4.8);
  const [travelMins, setTravelMins] = useState(14);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  const [selectedCategory, setSelectedCategory] = useState('Electronics & Gadgets');

  // Interactive Location Pinpointing Modal State
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'pickup' | 'dropoff'>('dropoff');

  // Backend Booking State
  const [activeBookingId, setActiveBookingId] = useState('AT-84920');
  const [activeOtp, setActiveOtp] = useState('5821');
  const [activePin, setActivePin] = useState('9412');

  // Live Pricing Quote Integration with Render Backend
  useEffect(() => {
    let active = true;
    async function fetchQuote() {
      try {
        const quote = await api.getPricingQuote(pickupCoords, dropoffCoords, selectedVehicle);
        if (active) {
          setDistanceKm(quote.distance_km);
          setTravelMins(quote.duration_mins);
        }
      } catch (err) {
        console.warn('Pricing quote fetch error:', err);
      }
    }
    fetchQuote();
    return () => {
      active = false;
    };
  }, [pickupCoords, dropoffCoords, selectedVehicle]);

  // Porter Add-ons State
  const [helperAddon, setHelperAddon] = useState(false);
  const [insuranceAddon, setInsuranceAddon] = useState(true);

  // Recipient / Booking Sheet State
  const [receiverName, setReceiverName] = useState('Priya Patel');
  const [receiverPhone, setReceiverPhone] = useState('+91 98123 45678');
  const [receiverFloor, setReceiverFloor] = useState('Flat 402, Green Glen Heights');
  const [specialNote, setSpecialNote] = useState('Leave with gate security if unreachable');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');

  // Active Tracking Lifecycle State
  const [deliveryStep, setDeliveryStep] = useState<DeliveryStep>('driver_assigned');
  const pickupOtp = '5821';
  const deliveryPin = '9412';

  // Modals State
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPackersMovers, setShowPackersMovers] = useState(false);
  const [pickupStop, setPickupStop] = useState<RouteStop>({
    id: 'stop_pickup',
    address: 'Indiranagar 100ft Rd, HAL 2nd Stage, Bengaluru',
    coordinates: { latitude: 12.9716, longitude: 77.6412 },
    contact: {
      name: 'Rahul Verma',
      phone: '+91 98765 43210',
      tag: 'Home',
      useMyNumber: true,
      houseDetails: 'Flat 402, Green Glen',
    },
  });
  const [dropStops, setDropStops] = useState<RouteStop[]>([
    {
      id: 'stop_drop_1',
      address: 'Koramangala 4th Block, 80ft Road, Bengaluru',
      coordinates: { latitude: 12.9352, longitude: 77.6245 },
      contact: {
        name: 'Priya Sharma',
        phone: '+91 98111 22334',
        tag: 'Shop',
        useMyNumber: false,
        houseDetails: 'Shop 12, Main Market',
      },
    },
  ]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showPodModal, setShowPodModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Completed State
  const [ratingStars, setRatingStars] = useState(5);
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([
    'Punctual & Fast',
    'Careful Handling',
  ]);
  const [tipPaise, setTipPaise] = useState<number>(2000); // ₹20 = 2000 paise

  // Authenticated Context & Onboarding State
  const { session, user, onboardingStatus, signOut } = useAuth();

  // Pulse Animation for Finding Driver
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (customerState === 'finding_driver') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
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

      const radarLoop = Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );
      radarLoop.start();

      // Simulated auto-dispatch in 2.5 seconds
      const timer = setTimeout(() => {
        setCustomerState('active_tracking');
        setDeliveryStep('driver_assigned');
      }, 2500);

      return () => {
        clearTimeout(timer);
        pulseLoop.stop();
        radarLoop.stop();
      };
    }
  }, [customerState, pulseAnim, radarAnim]);

  // Financial Calculations (Strict Integer Paise Invariants)
  const currentVehicleConfig =
    VEHICLE_CATALOG.find((v) => v.type === selectedVehicle) || VEHICLE_CATALOG[0];
  const baseFarePaise = currentVehicleConfig.baseFarePaise;

  // Helper fee: ₹50 (5000 paise) for Bike/Auto/Car, ₹150 (15000 paise) for Pickup
  const helperFeePaise = helperAddon
    ? selectedVehicle === 'pickup'
      ? 15000
      : 5000
    : 0;

  // Insurance fee: ₹15 (1500 paise)
  const insuranceFeePaise = insuranceAddon ? 1500 : 0;

  // Total trip fare
  const finalTotalPaise = baseFarePaise + helperFeePaise + insuranceFeePaise;

  // Address swap handler
  const handleSwapAddresses = () => {
    const tempAddr = pickupAddress;
    setPickupAddress(dropoffAddress);
    setDropoffAddress(tempAddr);

    const tempCoords = pickupCoords;
    setPickupCoords(dropoffCoords);
    setDropoffCoords(tempCoords);

    if (dropStops.length > 0) {
      const firstDrop = dropStops[0];
      const oldPickup = pickupStop;
      setPickupStop({
        ...firstDrop,
        id: 'stop_pickup',
      });
      setDropStops([
        {
          ...oldPickup,
          id: firstDrop.id,
        },
        ...dropStops.slice(1),
      ]);
    }
  };

  const handleAddDropStop = () => {
    if (dropStops.length >= 2) {
      Alert.alert('Max Stops Reached', 'You can add up to 2 delivery destinations per route.');
      return;
    }
    const newStop: RouteStop = {
      id: `stop_drop_${Date.now()}`,
      address: 'HSR Layout Sector 5, Bengaluru',
      coordinates: { latitude: 12.9121, longitude: 77.6446 },
      contact: {
        name: 'Ankit Patel',
        phone: '+91 97234 56789',
        tag: 'Other',
        useMyNumber: false,
        houseDetails: 'Tower B, Tech Park',
      },
    };
    setDropStops([...dropStops, newStop]);
  };

  const handleRemoveDropStop = (idx: number) => {
    if (dropStops.length <= 1) {
      Alert.alert('Required Stop', 'At least one delivery destination is required.');
      return;
    }
    setDropStops(dropStops.filter((_, i) => i !== idx));
  };

  // Next step simulation in active tracking
  const handleAdvanceDeliveryStep = () => {
    if (deliveryStep === 'driver_assigned') {
      setDeliveryStep('package_picked_up');
    } else if (deliveryStep === 'package_picked_up') {
      setDeliveryStep('in_transit');
    } else if (deliveryStep === 'in_transit') {
      setDeliveryStep('delivered');
      setTimeout(() => {
        setCustomerState('delivery_completed');
      }, 700);
    }
  };

  // Send in-app chat message
  const handleSendChatMessage = (textToSend?: string) => {
    const msg = (textToSend || chatInput).trim();
    if (!msg) return;
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
  };

  // Toggle feedback compliment
  const handleToggleCompliment = (item: string) => {
    setSelectedCompliments((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Create booking via live Render API
  const handleBookDelivery = async () => {
    setCustomerState('finding_driver');
    try {
      const res = await api.createBooking({
        customer_id: 'cust_blr_01',
        vehicle_type: selectedVehicle,
        parcel_size: 'small',
        weight_kg: 2.5,
        pickup_address: pickupAddress,
        pickup_coordinates: pickupCoords,
        dropoff_address: dropoffAddress,
        dropoff_coordinates: dropoffCoords,
        recipient_name: receiverName,
        recipient_phone: receiverPhone,
        delivery_notes: specialNote,
        payment_method: paymentMethod === 'cod' ? 'cash' : paymentMethod,
        fare_paise: finalTotalPaise,
      });
      if (res.id) setActiveBookingId(res.id);
      if (res.pickup_otp) setActiveOtp(res.pickup_otp);
      if (res.delivery_pin) setActivePin(res.delivery_pin);
    } catch (err) {
      console.warn('Booking create fallback to simulation:', err);
    }
  };

  // ==========================================
  // Render: Top App Bar
  // ==========================================
  const renderTopAppBar = () => (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logoTile}>
          <Image
            source={require('../../assets/images/emblem.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <TouchableOpacity
          style={styles.locationSelector}
          activeOpacity={0.8}
          onPress={() => {
            setPickerTarget('pickup');
            setShowLocationPicker(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Change city or pickup location"
        >
          <Text style={styles.locationPretitle}>DELIVER IN</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationCity}>
              {onboardingStatus?.profile?.city ? `${onboardingStatus.profile.city}, India` : 'Bengaluru, KA'}
            </Text>
            <ChevronDown size={14} color={colors.textPrimary} />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.headerRightActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="User profile"
          style={styles.authProfilePill}
          onPress={() => {
            const profile = onboardingStatus?.profile;
            const displayName = profile?.full_name || user?.phone || user?.email || 'Customer';
            const city = profile?.city || 'Bengaluru';
            const accountType = (profile?.account_type || 'personal').toUpperCase();

            Alert.alert(
              'Verified Account',
              `Customer: ${displayName}\nOperating Hub: ${city}\nCategory: ${accountType}\nWallet: ₹500 (Promo Credits)`,
              [
                { text: 'Close', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: signOut,
                },
              ]
            );
          }}
        >
          <User size={15} color={colors.textPrimary} />
          <Text style={styles.authProfileText}>
            {onboardingStatus?.profile?.full_name?.split(' ')[0] ||
              user?.phone?.replace('+91', '') ||
              user?.email?.split('@')[0] ||
              'Account'}
          </Text>
          <View style={styles.authStatusDot} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={styles.iconButton}
          onPress={() => Alert.alert('Notifications', 'No unread dispatch alerts.')}
        >
          <Bell size={19} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );

  // ==========================================
  // Render: Overview Tab: Send Parcel (Progressive Disclosure)
  // ==========================================
  const renderSendParcelTab = () => (
    <View style={styles.dispatchTabContainer}>
      {/* ========================================================= */}
      {/* STAGE 1: PORTER-GRADE DISCOVERY & SERVICE HOME            */}
      {/* ========================================================= */}
      {dispatchStep === 'route' && (
        <View style={styles.stageOneContainer}>
          {/* Quick "Where to?" Search Bar */}
          <TouchableOpacity
            style={styles.heroSearchBar}
            activeOpacity={0.88}
            onPress={() => setDispatchStep('vehicles')}
            accessibilityRole="button"
            accessibilityLabel="Where do you want to deliver?"
          >
            <View style={styles.searchIconTile}>
              <Search size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.searchCopy}>
              <Text style={styles.searchPlaceholder}>Where do you want to deliver?</Text>
              <Text style={styles.searchSubtext}>Enter drop location or pick on map</Text>
            </View>
            <View style={styles.searchArrowBtn}>
              <ArrowRight size={15} color={colors.onDark} />
            </View>
          </TouchableOpacity>

          {/* Section Heading */}
          <Text style={styles.sectionHeading}>SELECT SERVICE</Text>

          {/* 2 Wheeler Card */}
          <NeomorphCard
            style={styles.heroServiceCard}
            onPress={() => {
              setServiceMode('parcel');
              setSelectedVehicle('bike');
              setDispatchStep('vehicles');
            }}
          >
            <View style={styles.serviceCardLeft}>
              <View style={styles.serviceIconContainer}>
                <Bike size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.serviceTextGroup}>
                <View style={styles.serviceTitleRow}>
                  <Text style={styles.serviceMainTitle}>2 Wheeler</Text>
                  <View style={styles.serviceBadgeFast}>
                    <Text style={styles.serviceBadgeFastText}>FASTEST</Text>
                  </View>
                </View>
                <Text style={styles.serviceSubtitle}>
                  Parcels up to 20 kg • Documents, food, boxed items
                </Text>
              </View>
            </View>
            <View style={styles.serviceCardRight}>
              <Text style={styles.serviceFareFrom}>From ₹35</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          </NeomorphCard>

          {/* Freight Trucks Card */}
          <NeomorphCard
            style={styles.heroServiceCard}
            onPress={() => {
              setServiceMode('freight');
              setSelectedVehicle('car');
              setDispatchStep('vehicles');
            }}
          >
            <View style={styles.serviceCardLeft}>
              <View style={styles.serviceIconContainer}>
                <Truck size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.serviceTextGroup}>
                <View style={styles.serviceTitleRow}>
                  <Text style={styles.serviceMainTitle}>Trucks & Freight</Text>
                  <View style={styles.serviceBadgeCargo}>
                    <Text style={styles.serviceBadgeCargoText}>BULK CARGO</Text>
                  </View>
                </View>
                <Text style={styles.serviceSubtitle}>
                  Tata Ace, 8ft Pickup, 3W • Cargo up to 750 kg
                </Text>
              </View>
            </View>
            <View style={styles.serviceCardRight}>
              <Text style={styles.serviceFareFrom}>From ₹150</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          </NeomorphCard>

          {/* House Shifting (Packers & Movers) Card */}
          <NeomorphCard
            style={styles.heroServiceCard}
            onPress={() => setShowPackersMovers(true)}
          >
            <View style={styles.serviceCardLeft}>
              <View style={styles.serviceIconContainer}>
                <Building2 size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.serviceTextGroup}>
                <View style={styles.serviceTitleRow}>
                  <Text style={styles.serviceMainTitle}>House Shifting</Text>
                  <View style={styles.serviceBadgeRelo}>
                    <Text style={styles.serviceBadgeReloText}>FULL SERVICE</Text>
                  </View>
                </View>
                <Text style={styles.serviceSubtitle}>
                  Dedicated truck, trained loading crew & packing
                </Text>
              </View>
            </View>
            <View style={styles.serviceCardRight}>
              <Text style={styles.serviceFareFrom}>Quote</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          </NeomorphCard>

          {/* Quick Saved Destinations */}
          <View style={styles.savedSection}>
            <Text style={styles.sectionHeadingSubtle}>RECENT DESTINATIONS</Text>
            <View style={styles.savedPlacesRow}>
              <TouchableOpacity
                style={styles.savedPlaceTile}
                activeOpacity={0.82}
                onPress={() => {
                  setDropoffAddress('Flat 402, Green Glen Heights, Koramangala 4th Block');
                  setDropoffCoords({ latitude: 12.9352, longitude: 77.6245 });
                  setDispatchStep('vehicles');
                }}
              >
                <View style={styles.savedTileIcon}>
                  <Home size={14} color={colors.primaryDark} />
                </View>
                <View style={styles.savedTileCopy}>
                  <Text style={styles.savedTileTitle}>Home</Text>
                  <Text style={styles.savedTileSub} numberOfLines={1}>Koramangala</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.savedPlaceTile}
                activeOpacity={0.82}
                onPress={() => {
                  setDropoffAddress('WeWork Galaxy, 43 Residency Rd, Shanthala Nagar');
                  setDropoffCoords({ latitude: 12.9716, longitude: 77.5946 });
                  setDispatchStep('vehicles');
                }}
              >
                <View style={styles.savedTileIcon}>
                  <Building2 size={14} color={colors.primaryDark} />
                </View>
                <View style={styles.savedTileCopy}>
                  <Text style={styles.savedTileTitle}>Office</Text>
                  <Text style={styles.savedTileSub} numberOfLines={1}>Residency Rd</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.savedPlaceTile}
                activeOpacity={0.82}
                onPress={() => {
                  setDropoffAddress('Atarashi Logistics Peenya Hub, Industrial Area');
                  setDropoffCoords({ latitude: 13.0285, longitude: 77.5197 });
                  setDispatchStep('vehicles');
                }}
              >
                <View style={styles.savedTileIcon}>
                  <Package size={14} color={colors.primaryDark} />
                </View>
                <View style={styles.savedTileCopy}>
                  <Text style={styles.savedTileTitle}>Warehouse</Text>
                  <Text style={styles.savedTileSub} numberOfLines={1}>Peenya</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trust Assurance Banner */}
          <View style={styles.trustBanner}>
            <ShieldCheck size={16} color="#10B981" />
            <Text style={styles.trustText}>
              100% Electric & Eco Fleet • Direct GST Invoices • Live GPS
            </Text>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* STAGE 2: VEHICLE FLEET & PRICING DRAWER                   */}
      {/* ========================================================= */}
      {dispatchStep === 'vehicles' && (
        <View style={styles.stageTwoContainer}>
          {/* Header Back Navigation */}
          <View style={styles.subpageHeader}>
            <TouchableOpacity
              style={styles.backIconButton}
              onPress={() => setDispatchStep('route')}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
            >
              <ArrowLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.subpageHeaderCopy}>
              <Text style={styles.subpageTitle}>Select Vehicle</Text>
              <Text style={styles.subpageSubtitle} numberOfLines={1}>
                {pickupAddress.split(',')[0]} → {dropoffAddress.split(',')[0]} • {distanceKm} km
              </Text>
            </View>
          </View>

          {/* Route Configuration Card */}
          <NeomorphCard style={styles.stageTwoRouteCard}>
            {/* Pickup Stop Row */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setPickerTarget('pickup');
                setShowLocationPicker(true);
              }}
              style={styles.cleanStopRow}
            >
              <View style={styles.cleanStopIconBox}>
                <ArrowUp size={14} color={colors.primaryDark} />
              </View>
              <View style={styles.cleanStopCopy}>
                <Text style={styles.cleanStopLabel}>PICKUP POINT</Text>
                <Text style={styles.cleanStopAddress} numberOfLines={1}>
                  {pickupAddress}
                </Text>
              </View>
              <View style={styles.cleanPinpointBtn}>
                <Crosshair size={12} color={colors.textSecondary} />
                <Text style={styles.cleanPinpointText}>Change</Text>
              </View>
            </TouchableOpacity>

            {/* Route Divider with distance & swap button */}
            <View style={styles.cleanRouteDivider}>
              <View style={styles.cleanRouteLine} />
              <TouchableOpacity
                onPress={handleSwapAddresses}
                style={styles.cleanSwapBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Swap pickup and destination"
              >
                <ArrowUpDown size={13} color={colors.primaryDark} />
              </TouchableOpacity>
              <View style={styles.cleanRouteStatsBadge}>
                <Text style={styles.cleanRouteStatsText}>
                  {distanceKm} km • ~{travelMins} mins
                </Text>
              </View>
              <View style={styles.cleanRouteLine} />
            </View>

            {/* Drop Destination Stop Row */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setPickerTarget('dropoff');
                setShowLocationPicker(true);
              }}
              style={styles.cleanStopRow}
            >
              <View style={[styles.cleanStopIconBox, styles.cleanStopIconDropoff]}>
                <ArrowDown size={14} color="#DC2626" />
              </View>
              <View style={styles.cleanStopCopy}>
                <Text style={styles.cleanStopLabel}>DELIVERY DESTINATION</Text>
                <Text style={styles.cleanStopAddress} numberOfLines={1}>
                  {dropoffAddress}
                </Text>
              </View>
              <View style={styles.cleanPinpointBtn}>
                <Crosshair size={12} color={colors.textSecondary} />
                <Text style={styles.cleanPinpointText}>Change</Text>
              </View>
            </TouchableOpacity>
          </NeomorphCard>

          {/* Service Mode Selector */}
          <View style={styles.serviceModeContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setServiceMode('parcel');
                setSelectedVehicle('bike');
              }}
              style={[
                styles.serviceModeTab,
                serviceMode === 'parcel' && styles.serviceModeTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityLabel="Express Parcel service"
            >
              <Bike
                size={16}
                color={serviceMode === 'parcel' ? colors.onDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.serviceModeLabel,
                  serviceMode === 'parcel' && styles.serviceModeLabelActive,
                ]}
              >
                Express Parcel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setServiceMode('freight');
                setSelectedVehicle('car');
              }}
              style={[
                styles.serviceModeTab,
                serviceMode === 'freight' && styles.serviceModeTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityLabel="Freight Trucks service"
            >
              <Truck
                size={16}
                color={serviceMode === 'freight' ? colors.onDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.serviceModeLabel,
                  serviceMode === 'freight' && styles.serviceModeLabelActive,
                ]}
              >
                Freight Trucks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPackersMovers(true)}
              style={styles.serviceModeTab}
              accessibilityRole="button"
              accessibilityLabel="Packers and Movers House Shifting"
            >
              <Building2 size={16} color={colors.textPrimary} />
              <Text style={styles.serviceModeLabel}>House Shifting</Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Grid - Focused 2 Cards with Pure Clean Metadata */}
          <View style={styles.vehiclesGrid}>
            {(serviceMode === 'freight'
              ? VEHICLE_CATALOG.filter((v) => v.type === 'car' || v.type === 'pickup')
              : VEHICLE_CATALOG.filter((v) => v.type === 'bike' || v.type === 'auto')
            ).map((v) => {
              const isSelected = v.type === selectedVehicle;
              return (
                <TouchableOpacity
                  key={v.type}
                  activeOpacity={0.88}
                  onPress={() => setSelectedVehicle(v.type)}
                  style={[
                    styles.vehicleCard,
                    isSelected && styles.vehicleCardSelected,
                  ]}
                >
                  <View style={styles.vehicleCardHeader}>
                    <View
                      style={[
                        styles.vehicleIconTile,
                        isSelected && styles.vehicleIconTileSelected,
                      ]}
                    >
                      {v.icon(isSelected ? colors.onDark : colors.textPrimary)}
                    </View>
                    <View style={styles.vehicleFareTag}>
                      <Text style={styles.vehicleFareText}>{formatPaise(v.baseFarePaise)}</Text>
                    </View>
                  </View>

                  <Text style={styles.vehicleName}>{v.title}</Text>

                  <View style={styles.vehicleMetaRow}>
                    <View style={styles.weightBadge}>
                      <Text style={styles.weightBadgeText}>Max {v.maxWeightKg} kg</Text>
                    </View>
                    <Text style={styles.vehicleEtaText}>~{v.etaMins}m away</Text>
                  </View>

                  {isSelected && (
                    <View style={styles.selectedCheckPill}>
                      <Check size={11} color={colors.onDark} strokeWidth={3} />
                      <Text style={styles.selectedCheckText}>SELECTED</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Minimalist 1-Line Add-on & Coverage Strip */}
          <View style={styles.addonsSection}>
            <Text style={styles.sectionTitleSmall}>Add-ons & Transit Protection</Text>
            <View style={styles.addonChipsRow}>
              {/* Helper Toggle Chip */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setHelperAddon(!helperAddon)}
                style={[
                  styles.addonChip,
                  helperAddon && styles.addonChipActive,
                ]}
              >
                <User size={13} color={helperAddon ? colors.onDark : colors.primaryDark} />
                <Text
                  style={[
                    styles.addonChipText,
                    helperAddon && styles.addonChipTextActive,
                  ]}
                >
                  {helperAddon ? 'Helper: Active (₹50)' : '+ Loading Helper (₹50)'}
                </Text>
              </TouchableOpacity>

              {/* Insurance Toggle Chip */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setInsuranceAddon(!insuranceAddon)}
                style={[
                  styles.addonChip,
                  insuranceAddon && styles.addonChipActive,
                ]}
              >
                <ShieldCheck size={13} color={insuranceAddon ? colors.onDark : colors.primaryDark} />
                <Text
                  style={[
                    styles.addonChipText,
                    insuranceAddon && styles.addonChipTextActive,
                  ]}
                >
                  {insuranceAddon ? 'Insured: ₹10k Cover (₹15)' : '+ Transit Insurance'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Policy & Carriage Terms Trigger */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowFarePolicyModal(true)}
              style={styles.policyLinkRow}
            >
              <Info size={13} color={colors.textSecondary} />
              <Text style={styles.policyLinkText}>
                15 min free buffer included • Carriage Policy & Terms
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dedicated Stage 2 Bottom Action Card (Single Surface Dock) */}
          <NeomorphCard style={styles.vehicleActionCard}>
            <View style={styles.quoteSummaryRow}>
              <View style={styles.quoteFareCol}>
                <Text style={styles.quoteFareLabel}>ESTIMATED FARE</Text>
                <Text style={styles.quoteFareValue}>{formatPaise(finalTotalPaise)}</Text>
                <Text style={styles.quoteFareBreakdown} numberOfLines={1}>
                  {currentVehicleConfig.title} • {distanceKm} km
                  {helperAddon ? ' • Helper' : ''}
                  {insuranceAddon ? ' • Insured' : ''}
                </Text>
              </View>
              <PillButton
                title="Review & Book"
                variant="dark"
                size="md"
                style={styles.quoteProceedBtn}
                icon={<ArrowRight size={17} color={colors.onDark} />}
                onPress={() => setCustomerState('booking_sheet')}
              />
            </View>
          </NeomorphCard>
        </View>
      )}
    </View>
  );

  // ==========================================
  // Render: Overview Tab: Saved Places
  // ==========================================
  const renderSavedPlacesTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.sectionTitle}>Frequently Used Places</Text>
      <Text style={styles.sectionSubtitle}>Tap to auto-fill delivery route</Text>

      <NeomorphCard
        style={styles.placeItem}
        onPress={() => {
          setDropoffAddress('Flat 402, Green Glen Heights, Koramangala');
          setNavTab('dispatch');
          Alert.alert('Address Set', 'Set Home as dropoff destination!');
        }}
      >
        <View style={styles.placeIconBox}>
          <Home size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.placeCopy}>
          <Text style={styles.placeTitle}>Home</Text>
          <Text style={styles.placeAddress}>Flat 402, Green Glen Heights, Koramangala 4th Block</Text>
        </View>
        <ArrowRight size={18} color={colors.textMuted} />
      </NeomorphCard>

      <NeomorphCard
        style={styles.placeItem}
        onPress={() => {
          setPickupAddress('WeWork Galaxy, 43 Residency Rd, Shanthala Nagar');
          setNavTab('dispatch');
          Alert.alert('Address Set', 'Set Work as pickup point!');
        }}
      >
        <View style={styles.placeIconBox}>
          <Building2 size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.placeCopy}>
          <Text style={styles.placeTitle}>Work / Office</Text>
          <Text style={styles.placeAddress}>WeWork Galaxy, 43 Residency Rd, Shanthala Nagar</Text>
        </View>
        <ArrowRight size={18} color={colors.textMuted} />
      </NeomorphCard>

      <NeomorphCard
        style={styles.placeItem}
        onPress={() => {
          setPickupAddress('Atarashi Hub 3, 100ft Road, Indiranagar');
          setNavTab('dispatch');
          Alert.alert('Address Set', 'Set Warehouse as pickup point!');
        }}
      >
        <View style={styles.placeIconBox}>
          <Warehouse size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.placeCopy}>
          <Text style={styles.placeTitle}>Central Fulfillment Warehouse</Text>
          <Text style={styles.placeAddress}>Atarashi Hub 3, 100ft Road, Indiranagar</Text>
        </View>
        <ArrowRight size={18} color={colors.textMuted} />
      </NeomorphCard>

      <PillButton
        title="Add New Place"
        variant="outline"
        size="md"
        icon={<Plus size={16} color={colors.textPrimary} />}
        iconPosition="left"
        style={styles.addPlaceButton}
        onPress={() => Alert.alert('Add Place', 'Map place picker will open here.')}
      />
    </View>
  );

  // ==========================================
  // Render: Overview Tab: Wallet & Passes
  // ==========================================
  const renderWalletPassesTab = () => (
    <View style={styles.tabContentContainer}>
      <NeomorphCard variant="mint" style={styles.walletHeroCard}>
        <View style={styles.walletHeroHeader}>
          <View>
            <Text style={styles.walletHeroLabel}>CURRENT WALLET BALANCE</Text>
            <Text style={styles.walletHeroAmount}>₹ 1,250.00</Text>
            <Text style={styles.walletPaiseSub}>125,000 paise • Auto-refill active</Text>
          </View>
          <View style={styles.walletIconCircle}>
            <Wallet size={24} color={colors.dark} />
          </View>
        </View>

        <View style={styles.walletActionsRow}>
          <PillButton
            title="+ Top Up ₹500"
            variant="dark"
            size="sm"
            onPress={() => Alert.alert('Wallet', 'Simulated Razorpay top-up initiated!')}
          />
          <PillButton
            title="Payment Methods"
            variant="outline"
            size="sm"
            onPress={() => Alert.alert('Payment Methods', 'UPI / Card saved handles.')}
          />
        </View>
      </NeomorphCard>

      {/* Recent Ledger Transactions */}
      <Text style={styles.sectionTitle}>Recent Parcel Trips</Text>

      <NeomorphCard style={styles.txItem}>
        <View style={styles.txIconBox}>
          <Package size={18} color={colors.primaryDark} />
        </View>
        <View style={styles.txCopy}>
          <Text style={styles.txTitle}>Trip #AT-78190 • Bike</Text>
          <Text style={styles.txSubtitle}>Indiranagar → HSR Layout • Yesterday</Text>
        </View>
        <Text style={styles.txDebit}>-₹ 185.00</Text>
      </NeomorphCard>

      <NeomorphCard style={styles.txItem}>
        <View style={styles.txIconBox}>
          <CreditCard size={18} color={colors.primaryDark} />
        </View>
        <View style={styles.txCopy}>
          <Text style={styles.txTitle}>Wallet Top-Up via UPI</Text>
          <Text style={styles.txSubtitle}>Google Pay • Ref: 981244091</Text>
        </View>
        <Text style={styles.txCredit}>+₹ 500.00</Text>
      </NeomorphCard>
    </View>
  );

  // ==========================================
  // Render: Activity & Order History Tab
  // ==========================================
  const renderActivityTab = () => {
    if (customerState === 'active_tracking') {
      return renderActiveTracking();
    }

    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Shipments & Activity</Text>
          <Text style={styles.sectionSubtitle}>Real-time delivery history</Text>
        </View>

        {/* Live Tracking Cockpit Simulator Trigger Card */}
        <NeomorphCard style={styles.activityHeroCard}>
          <View style={styles.activityHeroRow}>
            <View style={styles.activityIconBox}>
              <Clock size={20} color={colors.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityHeroTitle}>Live Delivery Cockpit</Text>
              <Text style={styles.activityHeroSubtitle}>
                Inspect active courier telemetry, pickup OTP & real-time progress.
              </Text>
            </View>
          </View>
          <View style={styles.activityHeroActions}>
            <PillButton
              title="Launch Live Tracking Cockpit"
              variant="dark"
              size="sm"
              icon={<ArrowRight size={15} color={colors.onDark} />}
              onPress={() => {
                setCustomerState('active_tracking');
                setNavTab('activity');
              }}
            />
          </View>
        </NeomorphCard>

        {/* Completed Deliveries Header */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Completed Orders</Text>
          <Text style={styles.sectionSubtitle}>Recent Deliveries</Text>
        </View>

        {/* Delivery Item 1 */}
        <NeomorphCard style={styles.historyCard}>
          <View style={styles.historyCardHeader}>
            <View style={styles.historyVehicleBadge}>
              <Bike size={14} color={colors.dark} />
              <Text style={styles.historyVehicleText}>Bike Express • #AT-84920</Text>
            </View>
            <View style={styles.historyStatusPill}>
              <Check size={11} color={colors.dark} strokeWidth={3} />
              <Text style={styles.historyStatusText}>DELIVERED</Text>
            </View>
          </View>

          <View style={styles.historyRouteBlock}>
            <View style={styles.historyRouteRow}>
              <View style={styles.historyDotPickup} />
              <Text style={styles.historyAddressText} numberOfLines={1}>
                Indiranagar 100ft Road, Bengaluru
              </Text>
            </View>
            <View style={styles.historyRouteConnector} />
            <View style={styles.historyRouteRow}>
              <View style={styles.historyDotDrop} />
              <Text style={styles.historyAddressText} numberOfLines={1}>
                Koramangala 4th Block, Bengaluru
              </Text>
            </View>
          </View>

          <View style={styles.historyFooter}>
            <View>
              <Text style={styles.historyFareLabel}>TOTAL PAID</Text>
              <Text style={styles.historyFareValue}>₹ 200.00</Text>
            </View>
            <TouchableOpacity
              style={styles.invoiceBtn}
              onPress={() =>
                Alert.alert(
                  'Digital Tax Invoice',
                  'Invoice for #AT-84920 downloaded.\nAmount: ₹ 200.00 (Incl. 18% GST ₹30.51)'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Download tax invoice"
            >
              <FileText size={13} color={colors.dark} />
              <Text style={styles.invoiceBtnText}>Tax Invoice</Text>
            </TouchableOpacity>
          </View>
        </NeomorphCard>

        {/* Delivery Item 2 */}
        <NeomorphCard style={styles.historyCard}>
          <View style={styles.historyCardHeader}>
            <View style={styles.historyVehicleBadge}>
              <Package size={14} color={colors.dark} />
              <Text style={styles.historyVehicleText}>Auto Freight • #AT-78190</Text>
            </View>
            <View style={styles.historyStatusPill}>
              <Check size={11} color={colors.dark} strokeWidth={3} />
              <Text style={styles.historyStatusText}>DELIVERED</Text>
            </View>
          </View>

          <View style={styles.historyRouteBlock}>
            <View style={styles.historyRouteRow}>
              <View style={styles.historyDotPickup} />
              <Text style={styles.historyAddressText} numberOfLines={1}>
                HSR Layout Sector 2, Bengaluru
              </Text>
            </View>
            <View style={styles.historyRouteConnector} />
            <View style={styles.historyRouteRow}>
              <View style={styles.historyDotDrop} />
              <Text style={styles.historyAddressText} numberOfLines={1}>
                Bellandur Outer Ring Road, Bengaluru
              </Text>
            </View>
          </View>

          <View style={styles.historyFooter}>
            <View>
              <Text style={styles.historyFareLabel}>TOTAL PAID</Text>
              <Text style={styles.historyFareValue}>₹ 240.00</Text>
            </View>
            <TouchableOpacity
              style={styles.invoiceBtn}
              onPress={() =>
                Alert.alert(
                  'Digital Tax Invoice',
                  'Invoice for #AT-78190 downloaded.\nAmount: ₹ 240.00 (Incl. 18% GST ₹36.61)'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Download tax invoice"
            >
              <FileText size={13} color={colors.dark} />
              <Text style={styles.invoiceBtnText}>Tax Invoice</Text>
            </TouchableOpacity>
          </View>
        </NeomorphCard>
      </View>
    );
  };

  // ==========================================
  // Render: Phase 2 - Booking Sheet
  // ==========================================
  const renderBookingSheet = () => (
    <View style={styles.phaseContent}>
      {/* Header back nav */}
      <View style={styles.subpageHeader}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => setCustomerState('explore_quote')}
          accessibilityRole="button"
          accessibilityLabel="Back to quote"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.subpageTitle}>Booking Details</Text>
          <Text style={styles.subpageSubtitle}>
            {currentVehicleConfig.title} • {distanceKm} km
          </Text>
        </View>
      </View>

      {/* Receiver Details Card */}
      <NeomorphCard style={styles.formCard}>
        <Text style={styles.formSectionTitle}>RECIPIENT CONTACT</Text>

        <Input
          label="Recipient Full Name"
          value={receiverName}
          onChangeText={setReceiverName}
          placeholder="e.g. Priya Patel"
          prefix={<User size={16} color={colors.textMuted} />}
        />

        <View style={styles.fieldSpacer} />

        <Input
          label="Contact Mobile Number"
          value={receiverPhone}
          onChangeText={setReceiverPhone}
          placeholder="+91 98000 00000"
          keyboardType="phone-pad"
          prefix={<Phone size={16} color={colors.textMuted} />}
        />

        <View style={styles.fieldSpacer} />

        <Input
          label="House / Floor / Landmark"
          value={receiverFloor}
          onChangeText={setReceiverFloor}
          placeholder="Flat 402, Green Glen Heights"
          prefix={<MapPin size={16} color={colors.textMuted} />}
        />

        <View style={styles.fieldSpacer} />

        <Input
          label="Special Delivery Note (Optional)"
          value={specialNote}
          onChangeText={setSpecialNote}
          placeholder="e.g. Leave with gate security if unreachable"
          prefix={<FileText size={16} color={colors.textMuted} />}
        />
      </NeomorphCard>

      {/* Payment Method Selector */}
      <NeomorphCard style={styles.paymentMethodCard}>
        <Text style={styles.formSectionTitle}>PAYMENT OPTION</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.paymentOptionRow,
            paymentMethod === 'online' && styles.paymentOptionRowActive,
          ]}
          onPress={() => setPaymentMethod('online')}
        >
          <View style={styles.paymentOptionIcon}>
            <CreditCard
              size={18}
              color={paymentMethod === 'online' ? colors.primaryDark : colors.textSecondary}
            />
          </View>
          <View style={styles.paymentOptionCopy}>
            <Text style={styles.paymentOptionTitle}>Online Payment (UPI / Cards)</Text>
            <Text style={styles.paymentOptionSub}>Instant Razorpay checkout or GPay</Text>
          </View>
          <View
            style={[
              styles.radioCircle,
              paymentMethod === 'online' && styles.radioCircleActive,
            ]}
          >
            {paymentMethod === 'online' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.paymentOptionRow,
            paymentMethod === 'wallet' && styles.paymentOptionRowActive,
          ]}
          onPress={() => setPaymentMethod('wallet')}
        >
          <View style={styles.paymentOptionIcon}>
            <Wallet
              size={18}
              color={paymentMethod === 'wallet' ? colors.primaryDark : colors.textSecondary}
            />
          </View>
          <View style={styles.paymentOptionCopy}>
            <Text style={styles.paymentOptionTitle}>Atarashi Wallet (₹ 1,250.00)</Text>
            <Text style={styles.paymentOptionSub}>Instant deduction from balance</Text>
          </View>
          <View
            style={[
              styles.radioCircle,
              paymentMethod === 'wallet' && styles.radioCircleActive,
            ]}
          >
            {paymentMethod === 'wallet' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.paymentOptionRow,
            paymentMethod === 'cod' && styles.paymentOptionRowActive,
          ]}
          onPress={() => setPaymentMethod('cod')}
        >
          <View style={styles.paymentOptionIcon}>
            <Package
              size={18}
              color={paymentMethod === 'cod' ? colors.primaryDark : colors.textSecondary}
            />
          </View>
          <View style={styles.paymentOptionCopy}>
            <Text style={styles.paymentOptionTitle}>Cash on Delivery (COD)</Text>
            <Text style={styles.paymentOptionSub}>Recipient pays courier in cash</Text>
          </View>
          <View
            style={[
              styles.radioCircle,
              paymentMethod === 'cod' && styles.radioCircleActive,
            ]}
          >
            {paymentMethod === 'cod' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
      </NeomorphCard>

      {/* B2B Business Invoicing / GSTIN */}
      <NeomorphCard style={styles.paymentMethodCard}>
        <View style={styles.gstinHeaderRow}>
          <View style={styles.gstinIconBox}>
            <Building2 size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.gstinTitleCol}>
            <Text style={styles.formSectionTitle}>B2B BUSINESS INVOICE</Text>
            <Text style={styles.gstinSubtitle} numberOfLines={1}>
              {gstin
                ? `${gstin}${businessName ? ` • ${businessName}` : ''}`
                : 'Add GSTIN to claim 18% Input Tax Credit'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.gstinEditBtn}
            onPress={() => setShowGstinModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Configure B2B GSTIN"
          >
            <Text style={styles.gstinEditBtnText}>{gstin ? 'Edit' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>
      </NeomorphCard>

      {/* Itemized Fare Breakdown */}
      <NeomorphCard style={styles.breakdownCard}>
        <Text style={styles.formSectionTitle}>FARE BREAKDOWN</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Base & Transit Fare ({distanceKm} km)</Text>
          <Text style={styles.breakdownValue}>{formatPaise(baseFarePaise)}</Text>
        </View>

        {helperAddon && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Loading Helper Allowance</Text>
            <Text style={styles.breakdownValue}>{formatPaise(helperFeePaise)}</Text>
          </View>
        )}

        {insuranceAddon && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Package Transit Insurance (₹10,000 cover)</Text>
            <Text style={styles.breakdownValue}>{formatPaise(insuranceFeePaise)}</Text>
          </View>
        )}

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownTotalRow}>
          <View>
            <Text style={styles.breakdownTotalLabel}>FINAL AMOUNT DUE</Text>
            <Text style={styles.breakdownTotalTaxNote}>Includes all toll & taxes (paise)</Text>
          </View>
          <Text style={styles.breakdownTotalAmount}>{formatPaise(finalTotalPaise)}</Text>
        </View>
      </NeomorphCard>

      {/* Slide to Confirm Booking CTA */}
      <View style={styles.slideConfirmContainer}>
        <SlideToConfirm
          text={`Slide to Book • ${formatPaise(finalTotalPaise)}`}
          confirmedText="Dispatching Courier..."
          onConfirm={handleBookDelivery}
        />
      </View>
    </View>
  );

  // ==========================================
  // Render: Phase 3 - Finding Driver (Animated Radar)
  // ==========================================
  const renderFindingDriver = () => {
    const pulseScale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    });
    const pulseOpacity = pulseAnim.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.6, 0.2, 0],
    });

    return (
      <View style={styles.radarContainer}>
        {/* Animated Radar Pulse Rings */}
        <View style={styles.radarCenter}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.radarCoreTile}>
            <Package size={34} color={colors.dark} />
          </View>
        </View>

        <Text style={styles.radarTitle}>Broadcasting to Nearby Couriers...</Text>
        <Text style={styles.radarSubtitle}>
          Scanning 14 couriers within 2 km of Koramangala & Indiranagar
        </Text>

        <NeomorphCard style={styles.radarSummaryCard}>
          <View style={styles.radarSummaryRow}>
            <Text style={styles.radarSummaryLabel}>Selected Vehicle</Text>
            <Text style={styles.radarSummaryValue}>{currentVehicleConfig.title}</Text>
          </View>
          <View style={styles.radarSummaryRow}>
            <Text style={styles.radarSummaryLabel}>Estimated Transit Fare</Text>
            <Text style={styles.radarSummaryValue}>{formatPaise(finalTotalPaise)}</Text>
          </View>
          <View style={styles.radarSummaryRow}>
            <Text style={styles.radarSummaryLabel}>Recipient</Text>
            <Text style={styles.radarSummaryValue}>{receiverName}</Text>
          </View>
        </NeomorphCard>

        <PillButton
          title="Cancel Search"
          variant="outline"
          size="md"
          style={styles.radarCancelBtn}
          onPress={() => {
            Alert.alert('Cancel Request', 'Are you sure you want to stop finding a driver?', [
              { text: 'Keep Waiting', style: 'cancel' },
              { text: 'Cancel', style: 'destructive', onPress: () => setCustomerState('explore_quote') },
            ]);
          }}
        />
      </View>
    );
  };

  // ==========================================
  // Render: Phase 4 - Active Tracking Cockpit
  // ==========================================
  const renderActiveTracking = () => (
    <View style={styles.phaseContent}>
      {/* Live Vector Map */}
      <TactileMap
        pickupLabel={pickupAddress.split(',')[0]}
        dropoffLabel={dropoffAddress.split(',')[0]}
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
        distanceKm={distanceKm}
        durationMins={
          deliveryStep === 'driver_assigned' ? Math.round(travelMins * 0.4) : deliveryStep === 'in_transit' ? travelMins : 1
        }
        statusText={
          deliveryStep === 'driver_assigned'
            ? 'Courier en route to pickup'
            : deliveryStep === 'package_picked_up'
            ? 'Package in custody at pickup'
            : 'Courier in transit to destination'
        }
      />

      {/* Driver Information Card */}
      <NeomorphCard style={styles.driverCard}>
        <View style={styles.driverCardRow}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>RS</Text>
          </View>

          <View style={styles.driverMeta}>
            <View style={styles.driverNameRow}>
              <Text style={styles.driverName}>Rahul Sharma</Text>
              <View style={styles.ratingBadge}>
                <Star size={11} color="#D97706" fill="#F59E0B" />
                <Text style={styles.ratingText}>4.9 (1,420 trips)</Text>
              </View>
            </View>
            <Text style={styles.driverVehicle}>Hero Electric Optima (KA-01-EQ-4421)</Text>
            <Text style={styles.driverCompliance}>
              Verified Courier • Eco-Fleet Certified
            </Text>
          </View>

          <View style={styles.driverActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.contactCircleBtn}
              onPress={() => Linking.openURL('tel:9876543210')}
              accessibilityLabel="Call courier"
            >
              <Phone size={17} color={colors.onDark} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.contactCircleBtn}
              onPress={() => setShowChatModal(true)}
              accessibilityLabel="In-app chat"
            >
              <MessageSquare size={17} color={colors.onDark} />
            </TouchableOpacity>
          </View>
        </View>
      </NeomorphCard>

      {/* Bold Pickup OTP Card (Porter / Uber Package Requirement) */}
      <NeomorphCard variant="mint" style={styles.otpCard}>
        <View style={styles.otpHeader}>
          <View style={styles.otpShieldBadge}>
            <ShieldCheck size={16} color={colors.primaryDark} />
            <Text style={styles.otpShieldText}>SECURITY VERIFICATION CODE</Text>
          </View>
          <Text style={styles.otpStepIndicator}>
            {deliveryStep === 'driver_assigned' ? 'REQUIRED FOR PICKUP' : 'VERIFIED'}
          </Text>
        </View>

        <View style={styles.otpDisplayContainer}>
          <Text style={styles.otpDigitLabel}>PICKUP OTP</Text>
          <Text style={styles.otpDigitValue}>{activeOtp}</Text>
        </View>

        <View style={styles.otpWarningNotice}>
          <AlertCircle size={15} color={colors.primaryDark} />
          <Text style={styles.otpWarningText}>
            Share this OTP with driver ONLY upon physical handover of your package at pickup.
          </Text>
        </View>
      </NeomorphCard>

      {/* If in transit: Delivery PIN Card */}
      {deliveryStep === 'in_transit' && (
        <NeomorphCard style={styles.deliveryPinCard}>
          <View style={styles.pinHeader}>
            <Text style={styles.pinLabel}>DOORSTEP DELIVERY PIN</Text>
            <Text style={styles.pinValue}>{activePin}</Text>
          </View>
          <Text style={styles.pinSub}>
            Share this PIN with receiver ({receiverName}) to confirm delivery handover.
          </Text>
        </NeomorphCard>
      )}

      {/* Delivery Lifecycle Stepper */}
      <NeomorphCard style={styles.stepperCard}>
        <Text style={styles.formSectionTitle}>DELIVERY PROGRESS</Text>

        <View style={styles.stepperRow}>
          <View style={styles.stepIndicatorCol}>
            <View
              style={[
                styles.stepDot,
                (deliveryStep === 'driver_assigned' ||
                  deliveryStep === 'package_picked_up' ||
                  deliveryStep === 'in_transit' ||
                  deliveryStep === 'delivered') &&
                  styles.stepDotDone,
              ]}
            >
              <Check size={11} color={colors.onDark} strokeWidth={3} />
            </View>
            <View
              style={[
                styles.stepLine,
                (deliveryStep === 'package_picked_up' ||
                  deliveryStep === 'in_transit' ||
                  deliveryStep === 'delivered') &&
                  styles.stepLineDone,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                (deliveryStep === 'package_picked_up' ||
                  deliveryStep === 'in_transit' ||
                  deliveryStep === 'delivered') &&
                  styles.stepDotDone,
              ]}
            >
              <Check size={11} color={colors.onDark} strokeWidth={3} />
            </View>
            <View
              style={[
                styles.stepLine,
                (deliveryStep === 'in_transit' || deliveryStep === 'delivered') &&
                  styles.stepLineDone,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                (deliveryStep === 'in_transit' || deliveryStep === 'delivered') &&
                  styles.stepDotDone,
              ]}
            >
              <Check size={11} color={colors.onDark} strokeWidth={3} />
            </View>
            <View
              style={[
                styles.stepLine,
                deliveryStep === 'delivered' && styles.stepLineDone,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                deliveryStep === 'delivered' && styles.stepDotDone,
              ]}
            >
              <Check size={11} color={colors.onDark} strokeWidth={3} />
            </View>
          </View>

          <View style={styles.stepLabelsCol}>
            <View style={styles.stepLabelItem}>
              <Text style={styles.stepLabelTitle}>Driver Assigned</Text>
              <Text style={styles.stepLabelSub}>Rahul Sharma accepted dispatch</Text>
            </View>

            <View style={styles.stepLabelItem}>
              <Text style={styles.stepLabelTitle}>Package Picked Up</Text>
              <Text style={styles.stepLabelSub}>OTP {activeOtp} verified by courier</Text>
            </View>

            <View style={styles.stepLabelItem}>
              <Text style={styles.stepLabelTitle}>In Transit</Text>
              <Text style={styles.stepLabelSub}>Heading to {dropoffAddress}</Text>
            </View>

            <View style={styles.stepLabelItem}>
              <Text style={styles.stepLabelTitle}>Delivered</Text>
              <Text style={styles.stepLabelSub}>Doorstep physical handover completed</Text>
            </View>
          </View>
        </View>

        {/* Demo Stage Advance Simulator */}
        <View style={styles.stageSimulatorBox}>
          <Text style={styles.simulatorNote}>
            [Simulation Control: Tap below to advance through lifecycle stages]
          </Text>
          <PillButton
            title={
              deliveryStep === 'driver_assigned'
                ? 'Simulate Driver Picked Up'
                : deliveryStep === 'package_picked_up'
                ? 'Simulate In Transit'
                : 'Simulate Delivered'
            }
            variant="dark"
            size="sm"
            onPress={handleAdvanceDeliveryStep}
          />
        </View>
      </NeomorphCard>

      {/* Proof of Delivery (POD) Inspection Photo Link */}
      <NeomorphCard
        style={styles.podLinkCard}
        onPress={() => setShowPodModal(true)}
      >
        <View style={styles.podIconBox}>
          <Camera size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.podCopy}>
          <Text style={styles.podTitle}>Proof of Delivery (POD) Photos</Text>
          <Text style={styles.podSub}>
            Tap to view tamper-evident custody inspection photos taken by courier.
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </NeomorphCard>

      {/* Cancel Booking Action */}
      <PillButton
        title="Cancel Delivery"
        variant="outline"
        size="md"
        style={styles.cancelDeliveryBtn}
        onPress={() => setShowCancelModal(true)}
      />
    </View>
  );

  // ==========================================
  // Render: Phase 5 - Delivery Completed
  // ==========================================
  const renderDeliveryCompleted = () => (
    <View style={styles.phaseContent}>
      {/* Celebration Header Card */}
      <NeomorphCard variant="mint" style={styles.celebrationCard}>
        <View style={styles.celebrationCheckCircle}>
          <CheckCircle2 size={44} color={colors.primaryDark} />
        </View>
        <Text style={styles.celebrationTitle}>Delivered Successfully!</Text>
        <Text style={styles.celebrationSub}>
          Package handed over to {receiverName} at {receiverFloor}.
        </Text>
        <Text style={styles.celebrationTime}>Completed at 11:42 AM IST • On-Time Guarantee</Text>
      </NeomorphCard>

      {/* Itemized Final Tax Invoice Receipt */}
      <NeomorphCard style={styles.taxInvoiceCard}>
        <View style={styles.invoiceHeader}>
          <View>
            <Text style={styles.invoiceTitle}>TAX INVOICE RECEIPT</Text>
            <Text style={styles.invoiceBookingId}>Booking ID: {activeBookingId}</Text>
          </View>
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>PAID</Text>
          </View>
        </View>

        <View style={styles.invoiceDivider} />

        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Vehicle Class</Text>
          <Text style={styles.invoiceValue}>{currentVehicleConfig.title}</Text>
        </View>
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Base & Distance Fare ({distanceKm} km)</Text>
          <Text style={styles.invoiceValue}>{formatPaise(baseFarePaise)}</Text>
        </View>
        {helperAddon && (
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Loading Helper Fee</Text>
            <Text style={styles.invoiceValue}>{formatPaise(helperFeePaise)}</Text>
          </View>
        )}
        {insuranceAddon && (
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Transit Insurance (₹10k cover)</Text>
            <Text style={styles.invoiceValue}>{formatPaise(insuranceFeePaise)}</Text>
          </View>
        )}

        <View style={styles.invoiceDivider} />

        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceTotalLabel}>Total Amount Paid</Text>
          <Text style={styles.invoiceTotalAmount}>{formatPaise(finalTotalPaise)}</Text>
        </View>

        <View style={styles.invoiceTaxNoteRow}>
          <Text style={styles.invoiceTaxNote}>
            Includes CGST 9% ({formatPaise(Math.round((finalTotalPaise * 9) / 109))}) + SGST 9% ({formatPaise(Math.round((finalTotalPaise * 9) / 109))})
          </Text>
          <Text style={styles.invoicePaymentMode}>
            via {paymentMethod.toUpperCase()}
          </Text>
        </View>
      </NeomorphCard>

      {/* 5-Star Driver Rating Card */}
      <NeomorphCard style={styles.ratingCard}>
        <Text style={styles.formSectionTitle}>RATE YOUR COURIER</Text>
        <Text style={styles.ratingPrompt}>How was your experience with Rahul Sharma?</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              activeOpacity={0.8}
              onPress={() => setRatingStars(star)}
              style={styles.starTouch}
            >
              <Star
                size={32}
                color={star <= ratingStars ? '#F59E0B' : colors.border}
                fill={star <= ratingStars ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Compliment Chips */}
        <Text style={styles.complimentHeader}>What went exceptionally well?</Text>
        <View style={styles.complimentRow}>
          {[
            'Punctual & Fast',
            'Careful Handling',
            'Polite Courier',
            'Clean Vehicle',
          ].map((item) => {
            const isSelected = selectedCompliments.includes(item);
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.85}
                onPress={() => handleToggleCompliment(item)}
                style={[
                  styles.complimentChip,
                  isSelected && styles.complimentChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.complimentText,
                    isSelected && styles.complimentTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional Driver Tip */}
        <Text style={styles.complimentHeader}>Add a courier tip (100% goes to Rahul)</Text>
        <View style={styles.tipRow}>
          {[
            { label: '₹10', paise: 1000 },
            { label: '₹20', paise: 2000 },
            { label: '₹50', paise: 5000 },
            { label: 'Custom', paise: 10000 },
          ].map((t) => {
            const isTipSelected = tipPaise === t.paise;
            return (
              <TouchableOpacity
                key={t.label}
                activeOpacity={0.85}
                onPress={() => setTipPaise(t.paise)}
                style={[
                  styles.tipChip,
                  isTipSelected && styles.tipChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tipChipText,
                    isTipSelected && styles.tipChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </NeomorphCard>

      {/* Book Another Delivery CTA */}
      <PillButton
        title="Book Another Delivery"
        variant="dark"
        size="lg"
        icon={<RotateCcw size={18} color={colors.onDark} />}
        style={styles.bookAnotherBtn}
        onPress={() => {
          setCustomerState('explore_quote');
          setNavTab('dispatch');
          setDeliveryStep('driver_assigned');
        }}
      />
    </View>
  );

  // ==========================================
  // Render: In-App Chat Modal
  // ==========================================
  const renderChatModal = () => (
    <Modal
      visible={showChatModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowChatModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.chatModalContent}>
          <View style={styles.chatModalHeader}>
            <View>
              <Text style={styles.chatModalTitle}>Chat with Rahul Sharma</Text>
              <Text style={styles.chatModalSub}>Hero Electric Optima • Courier</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowChatModal(false)}
              style={styles.modalCloseBtn}
            >
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.chatMessagesList}>
            <View style={styles.receivedMsgBox}>
              <Text style={styles.receivedMsgText}>
                Hello! I am on my way to {pickupAddress}. Arriving in ~4 mins.
              </Text>
              <Text style={styles.msgTimestamp}>11:28 AM</Text>
            </View>

            {chatMessages.map((msg, idx) => (
              <View key={idx} style={styles.sentMsgBox}>
                <Text style={styles.sentMsgText}>{msg}</Text>
                <Text style={styles.msgTimestampSent}>Just now</Text>
              </View>
            ))}
          </ScrollView>

          {/* Preset Quick Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chatPresetRow}
          >
            {CHAT_PRESETS.map((preset, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chatPresetChip}
                onPress={() => handleSendChatMessage(preset)}
              >
                <Text style={styles.chatPresetText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatTextInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Type message..."
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={styles.chatSendBtn}
              onPress={() => handleSendChatMessage()}
            >
              <Send size={16} color={colors.onDark} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // Render: Proof of Delivery (POD) Modal
  // ==========================================
  const renderPodModal = () => (
    <Modal
      visible={showPodModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowPodModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.podModalContent}>
          <View style={styles.chatModalHeader}>
            <View>
              <Text style={styles.chatModalTitle}>Proof of Delivery (POD)</Text>
              <Text style={styles.chatModalSub}>Digital Custody Chain Verification</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowPodModal(false)}
              style={styles.modalCloseBtn}
            >
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.podScroll}>
            <Text style={styles.podSectionLabel}>PICKUP INSPECTION PHOTO</Text>
            <View style={styles.simulatedPhotoBox}>
              <Camera size={32} color={colors.primaryDark} />
              <Text style={styles.photoCaption}>Parcel Seal & Barcode Verified</Text>
              <Text style={styles.photoTimestamp}>Captured at 11:32 AM • Indiranagar Hub</Text>
            </View>

            <Text style={styles.podSectionLabel}>DOORSTEP HANDOVER PHOTO</Text>
            <View style={styles.simulatedPhotoBox}>
              <CheckCircle2 size={32} color={colors.primaryDark} />
              <Text style={styles.photoCaption}>Delivered to Flat 402 Doorstep</Text>
              <Text style={styles.photoTimestamp}>Captured at 11:42 AM • Koramangala</Text>
            </View>

            <View style={styles.digitalSignatureBox}>
              <Text style={styles.sigLabel}>RECIPIENT DIGITAL CONFIRMATION</Text>
              <Text style={styles.sigValue}>Priya Patel [Verified via PIN 9412]</Text>
            </View>
          </ScrollView>

          <PillButton
            title="Done"
            variant="dark"
            size="md"
            style={{ marginTop: 12 }}
            onPress={() => setShowPodModal(false)}
          />
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // Render: Cancel Booking Modal
  // ==========================================
  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowCancelModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.cancelModalContent}>
          <Text style={styles.cancelModalTitle}>Cancel Delivery Request?</Text>
          <Text style={styles.cancelModalSub}>
            Please select a reason. No cancellation fee applies within 5 minutes of booking.
          </Text>

          <View style={styles.cancelReasonsList}>
            {CANCEL_REASONS.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={styles.cancelReasonItem}
                onPress={() => {
                  setShowCancelModal(false);
                  setCustomerState('explore_quote');
                  Alert.alert('Delivery Cancelled', 'Your delivery booking has been cancelled.');
                }}
              >
                <Text style={styles.cancelReasonText}>{r}</Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <PillButton
            title="Keep My Delivery"
            variant="outline"
            size="md"
            style={{ marginTop: 14 }}
            onPress={() => setShowCancelModal(false)}
          />
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // Render: Fare Policy & Loading Buffer Modal
  // ==========================================
  const renderFarePolicyModal = () => (
    <Modal
      visible={showFarePolicyModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFarePolicyModal(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setShowFarePolicyModal(false)}
      >
        <Pressable style={styles.policyModalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.policyModalHeader}>
            <View style={styles.policyModalTitleRow}>
              <ShieldCheck size={20} color={colors.primaryDark} />
              <Text style={styles.policyModalTitle}>Carriage & Buffer Policy</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowFarePolicyModal(false)}
              style={styles.policyModalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close policy modal"
            >
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <LoadingBufferPill
              variant="card"
              freeMinutes={15}
              overageRatePaise={250}
            />

            <View style={styles.policyInfoBox}>
              <Text style={styles.policyInfoHeading}>Safety & Legal Invariants</Text>
              <Text style={styles.policyInfoText}>
                • All parcel dispatches conform strictly to the Carriage by Road Act, 2007.
              </Text>
              <Text style={styles.policyInfoText}>
                • Prohibited hazardous goods (flammables, explosives, toxic chemicals, narcotics) are strictly disallowed.
              </Text>
              <Text style={styles.policyInfoText}>
                • Optional transit insurance covers up to ₹10,000 for package loss or in-transit physical damage.
              </Text>
            </View>

            <PillButton
              title="Understood"
              variant="dark"
              size="md"
              style={{ marginTop: 16, marginBottom: 8 }}
              onPress={() => setShowFarePolicyModal(false)}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ==========================================
  // Main Return
  // ==========================================
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {renderTopAppBar()}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              customerState === 'explore_quote' && navTab === 'dispatch' && dispatchStep === 'route'
                ? 110
                : 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {navTab === 'dispatch' && (
          <>
            {customerState === 'explore_quote' && renderSendParcelTab()}
            {customerState === 'booking_sheet' && renderBookingSheet()}
            {customerState === 'finding_driver' && renderFindingDriver()}
            {customerState === 'active_tracking' && renderActiveTracking()}
            {customerState === 'delivery_completed' && renderDeliveryCompleted()}
          </>
        )}

        {navTab === 'activity' && renderActivityTab()}
        {navTab === 'saved_places' && renderSavedPlacesTab()}
        {navTab === 'wallet' && renderWalletPassesTab()}
      </ScrollView>

      {/* Floating Neomorphic Bottom Navigation Bar */}
      {((customerState === 'explore_quote' && dispatchStep === 'route' && navTab === 'dispatch') ||
        navTab !== 'dispatch') && (
        <BottomNavigationBar
          activeTab={navTab}
          onTabChange={(tab) => {
            setNavTab(tab);
          }}
          onCenterFabPress={() => {
            setNavTab('dispatch');
            setCustomerState('explore_quote');
            setDispatchStep('route');
          }}
          activeOrderCount={customerState === 'active_tracking' ? 1 : 0}
        />
      )}

      {/* Overlay Modals */}
      {renderChatModal()}
      {renderPodModal()}
      {renderCancelModal()}
      {renderFarePolicyModal()}

      {/* Interactive Location Pinpointing Modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        target={pickerTarget}
        initialAddress={pickerTarget === 'dropoff' ? dropoffAddress : pickupAddress}
        initialCoords={pickerTarget === 'dropoff' ? dropoffCoords : pickupCoords}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={(addr, coords) => {
          if (pickerTarget === 'dropoff') {
            setDropoffAddress(addr);
            setDropoffCoords(coords);
          } else {
            setPickupAddress(addr);
            setPickupCoords(coords);
          }
        }}
      />

      {/* B2B GSTIN Invoicing Modal */}
      <B2BGSTINModal
        visible={showGstinModal}
        currentGstin={gstin}
        currentBusinessName={businessName}
        onClose={() => setShowGstinModal(false)}
        onSave={(newGstin, newBizName) => {
          setGstin(newGstin);
          setBusinessName(newBizName);
        }}
      />

      {/* Packers & Movers 3-Step Shifting Flow Modal */}
      <PackersMoversModal
        visible={showPackersMovers}
        onClose={() => setShowPackersMovers(false)}
        pickupAddress={pickupAddress}
        dropAddress={dropoffAddress}
        onBookingConfirmed={(shiftingDetails) => {
          setShowPackersMovers(false);
          Alert.alert(
            'Shifting Scheduled!',
            `House shifting scheduled for ${shiftingDetails.schedule.dateLabel} (${shiftingDetails.schedule.timeSlot}). Total: ₹${shiftingDetails.totalFareRupees}`
          );
        }}
      />
    </SafeAreaView>
  );
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scrollContentWithDock: {
    paddingBottom: 130,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
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
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  logo: {
    width: 26,
    height: 26,
  },
  locationSelector: {
    justifyContent: 'center',
  },
  locationPretitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  locationCity: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...theme.shadows.button,
  },
  authProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  authStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },
  tabBarContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: sizes.md,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Service Mode Segmented Control
  serviceModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: theme.radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  serviceModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: theme.radius.pill,
    gap: 6,
  },
  serviceModeTabActive: {
    backgroundColor: colors.dark,
    ...theme.shadows.button,
  },
  serviceModeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  serviceModeLabelActive: {
    color: colors.onDark,
    fontWeight: '800',
  },

  // Route & Address Card
  packersMoversBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  packersMoversIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packersMoversTitle: {
    fontSize: sizes.base,
    fontWeight: '700',
    color: colors.dark,
    marginRight: 8,
  },
  packersMoversSubtitle: {
    fontSize: sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newBadgePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 0.5,
  },
  routeCard: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: theme.radius.xl,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routeHeaderTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pinCirclePickup: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pinDotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
  },
  pinCircleDropoff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pinDotDropoff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  addressInfo: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  pinpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  pinpointBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  addressSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  routeDividerLine: {
    height: 18,
    width: 2,
    backgroundColor: colors.border,
    marginLeft: 10,
    marginVertical: 4,
  },
  routeMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  metricPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Vehicle Selector
  vehiclesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  vehicleCard: {
    width: '48.3%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative',
    ...theme.shadows.card,
  },
  vehicleCardSelected: {
    borderColor: colors.dark,
    borderWidth: 2,
    backgroundColor: colors.surface,
    ...theme.shadows.card,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleIconTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconTileSelected: {
    backgroundColor: colors.dark,
  },
  vehicleFareTag: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  vehicleFareText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  weightBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  vehicleEtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  selectedCheckPill: {
    position: 'absolute',
    top: -6,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.dark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  selectedCheckText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.onDark,
    letterSpacing: 0.5,
  },

  // Cargo Categories
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingRight: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  categoryChipSelected: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryChipTextSelected: {
    color: colors.onDark,
  },

  // Porter Add-ons
  addonsCard: {
    marginTop: 4,
    padding: spacing.md,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addonIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonCopy: {
    flex: 1,
  },
  addonTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  addonDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    ...theme.shadows.button,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
  },
  addonDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  // Progressive Disclosure Layout Styles
  dispatchTabContainer: {
    flex: 1,
  },
  stageOneContainer: {
    gap: 10,
  },

  // Hero Search Bar
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  searchIconTile: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchCopy: {
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  searchSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Headings
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sectionHeadingSubtle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Hero Service Cards
  heroServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  serviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTextGroup: {
    flex: 1,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  serviceMainTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  serviceBadgeFast: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  serviceBadgeFastText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  serviceBadgeCargo: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  serviceBadgeCargoText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  serviceBadgeRelo: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  serviceBadgeReloText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  serviceSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  serviceCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
  },
  serviceFareFrom: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  // Saved Section
  savedSection: {
    marginTop: 6,
  },
  savedPlacesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  savedPlaceTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  savedTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedTileCopy: {
    flex: 1,
  },
  savedTileTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  savedTileSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Trust Banner
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: 8,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  stageTwoRouteCard: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  heroMapContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  cleanRouteCard: {
    padding: 16,
    borderRadius: 20,
  },
  cleanStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  cleanStopIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanStopIconDropoff: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  cleanStopCopy: {
    flex: 1,
  },
  cleanStopLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  cleanStopAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  cleanPinpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cleanPinpointText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cleanRouteDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  cleanRouteLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  cleanSwapBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanRouteStatsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cleanRouteStatsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  savedPlacesStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  savedPlacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedPlacePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectVehicleBtn: {
    marginTop: 10,
    width: '100%',
  },
  stageTwoContainer: {
    gap: 14,
  },
  subpageHeaderCopy: {
    flex: 1,
  },
  addonsSection: {
    marginTop: 6,
  },
  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  addonChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  addonChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  addonChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addonChipTextActive: {
    color: colors.onDark,
  },
  policyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },
  policyLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  vehicleActionCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 8,
    ...theme.shadows.card,
  },
  policyModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  policyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  policyModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  policyModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyInfoBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  policyInfoHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  policyInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Quote Summary Bar
  quoteSummaryCard: {
    width: '100%',
    maxWidth: 440,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...theme.shadows.floating,
  },
  quoteSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  quoteFareCol: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteFareLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  quoteFareValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark,
    marginTop: 1,
  },
  quoteFareBreakdown: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  quoteProceedBtn: {
    flexShrink: 0,
  },

  // Tab: Saved Places
  tabContentContainer: {
    marginTop: spacing.xs,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: theme.radius.xl,
  },
  placeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeCopy: {
    flex: 1,
  },
  placeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  placeAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addPlaceButton: {
    marginTop: 10,
  },

  // Tab: Wallet & Passes
  walletHeroCard: {
    padding: 18,
    borderRadius: theme.radius.xl,
  },
  walletHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletHeroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  walletHeroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark,
    marginTop: 2,
  },
  walletPaiseSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  walletIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  walletActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  passCard: {
    marginTop: 12,
    padding: 16,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  passBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  passValidity: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  passTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  passDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txCopy: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txDebit: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  txCredit: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  // Subpage / Phase Container
  phaseContent: {
    paddingTop: 4,
  },
  subpageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  backIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },
  subpageTitle: {
    fontSize: sizes.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subpageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },

  // Booking Sheet Form
  formCard: {
    padding: spacing.md,
    marginBottom: 12,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  fieldSpacer: {
    height: 12,
  },
  paymentMethodCard: {
    padding: spacing.md,
    marginBottom: 12,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  paymentOptionRowActive: {
    borderColor: colors.primaryDark,
    backgroundColor: '#F8FCF8',
  },
  paymentOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  paymentOptionCopy: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  paymentOptionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primaryDark,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },

  // Fare Breakdown
  breakdownCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  breakdownTotalTaxNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  breakdownTotalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark,
  },
  bookDeliveryBtn: {
    marginBottom: spacing.lg,
  },
  slideConfirmContainer: {
    marginBottom: spacing.lg,
  },
  gstinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gstinIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gstinTitleCol: {
    flex: 1,
  },
  gstinSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  gstinEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gstinEditBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  // Phase 3: Finding Driver Radar
  radarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  radarCenter: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.lg,
  },
  radarRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'rgba(110, 231, 135, 0.15)',
  },
  radarCoreTile: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glowGreen,
  },
  radarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  radarSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 6,
    lineHeight: 18,
  },
  radarSummaryCard: {
    width: '100%',
    padding: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  radarSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  radarSummaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  radarSummaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  radarCancelBtn: {
    width: '100%',
  },

  // Phase 4: Active Tracking Cockpit
  driverCard: {
    padding: 14,
    marginBottom: 10,
  },
  driverCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onDark,
  },
  driverMeta: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  driverVehicle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  driverCompliance: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  contactCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },

  // Bold Pickup OTP Card
  otpCard: {
    padding: 16,
    marginBottom: 10,
    borderRadius: theme.radius.xl,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  otpShieldText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  otpStepIndicator: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.dark,
  },
  otpDisplayContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  otpDigitLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  otpDigitValue: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.dark,
    letterSpacing: 8,
    marginTop: 2,
  },
  otpWarningNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 135, 0.4)',
  },
  otpWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
    lineHeight: 15,
  },

  // Doorstep Delivery PIN
  deliveryPinCard: {
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 1,
  },
  pinValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 3,
  },
  pinSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 4,
    fontWeight: '500',
  },

  // Delivery Stepper
  stepperCard: {
    padding: spacing.md,
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  stepLine: {
    width: 2,
    height: 34,
    backgroundColor: colors.border,
  },
  stepLineDone: {
    backgroundColor: colors.primaryDark,
  },
  stepLabelsCol: {
    flex: 1,
    paddingLeft: 12,
  },
  stepLabelItem: {
    height: 56,
    justifyContent: 'flex-start',
  },
  stepLabelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stepLabelSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stageSimulatorBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  simulatorNote: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Proof of delivery link
  podLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
  },
  podIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  podCopy: {
    flex: 1,
  },
  podTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  podSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelDeliveryBtn: {
    marginBottom: spacing.xl,
  },

  // Phase 5: Delivery Completed Celebration
  celebrationCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 12,
  },
  celebrationCheckCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadows.glowGreen,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark,
    textAlign: 'center',
  },
  celebrationSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  celebrationTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 8,
  },

  // Tax Invoice Card
  taxInvoiceCard: {
    padding: spacing.md,
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  invoiceBookingId: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  invoiceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  invoiceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  invoiceTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  invoiceTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.dark,
  },
  invoiceTaxNoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  invoiceTaxNote: {
    fontSize: 10,
    color: colors.textMuted,
  },
  invoicePaymentMode: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  // Rating & Tip
  ratingCard: {
    padding: spacing.md,
    marginBottom: 14,
  },
  ratingPrompt: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  complimentHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  complimentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  complimentChip: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
  },
  complimentChipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  complimentText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  complimentTextActive: {
    color: colors.onDark,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tipChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  tipChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tipChipTextActive: {
    color: colors.dark,
  },
  bookAnotherBtn: {
    marginBottom: spacing.xl,
  },

  // Modals Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 19, 0.65)',
    justifyContent: 'flex-end',
  },
  chatModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.md,
    maxHeight: '80%',
    minHeight: 420,
  },
  chatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chatModalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMessagesList: {
    flex: 1,
    paddingVertical: 12,
  },
  receivedMsgBox: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '80%',
    marginBottom: 8,
  },
  receivedMsgText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  sentMsgBox: {
    alignSelf: 'flex-end',
    backgroundColor: colors.dark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '80%',
    marginBottom: 8,
  },
  sentMsgText: {
    fontSize: 13,
    color: colors.onDark,
    lineHeight: 18,
  },
  msgTimestamp: {
    fontSize: 9,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  msgTimestampSent: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatPresetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  chatPresetChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatPresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  chatTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // POD Modal
  podModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.md,
    maxHeight: '85%',
  },
  podScroll: {
    paddingVertical: 10,
  },
  podSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  simulatedPhotoBox: {
    height: 120,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 10,
  },
  photoCaption: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  photoTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
  },
  digitalSignatureBox: {
    padding: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: theme.radius.lg,
    marginTop: 8,
  },
  sigLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  sigValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 2,
  },

  // Cancel Modal
  cancelModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.md,
  },
  cancelModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cancelModalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  cancelReasonsList: {
    marginTop: 14,
    gap: 8,
  },
  cancelReasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelReasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },

  // Activity & History Tab
  activityHeroCard: {
    padding: spacing.md,
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  activityHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  activityHeroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  activityHeroActions: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  historyCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyVehicleText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 0.5,
  },
  historyRouteBlock: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  historyRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark,
  },
  historyDotDrop: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  historyRouteConnector: {
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 3,
    marginVertical: 2,
  },
  historyAddressText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyFareLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  historyFareValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 1,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark,
  },
});
