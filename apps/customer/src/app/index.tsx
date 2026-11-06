import type { VehicleType } from '@atarashi/domain';
import { Image } from 'expo-image';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Bike,
  Building2,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
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
import { TactileCard } from '@/components/ui/tactile-card';
import { TactileMap } from '@/components/ui/tactile-map';
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
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('send_parcel');

  // Booking Configuration State
  const [pickupAddress, setPickupAddress] = useState('Indiranagar 100ft Road, Bengaluru');
  const [dropoffAddress, setDropoffAddress] = useState('Koramangala 4th Block, Bengaluru');
  const [distanceKm, setDistanceKm] = useState(4.8);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  const [selectedCategory, setSelectedCategory] = useState('Electronics & Gadgets');

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
    const temp = pickupAddress;
    setPickupAddress(dropoffAddress);
    setDropoffAddress(temp);
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
        <View>
          <Text style={styles.eyebrow}>ATARASHI LOGISTICS</Text>
          <Text style={styles.title}>Customer Hub</Text>
        </View>
      </View>
      <View style={styles.headerRightActions}>
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
  // Render: Overview Tab: Send Parcel
  // ==========================================
  const renderSendParcelTab = () => (
    <View>
      {/* Route & Address Card */}
      <NeomorphCard style={styles.routeCard}>
        <View style={styles.routeHeader}>
          <Text style={styles.routeHeaderTitle}>DELIVERY ROUTE</Text>
          <TouchableOpacity
            style={styles.swapButton}
            onPress={handleSwapAddresses}
            activeOpacity={0.8}
            accessibilityLabel="Swap pickup and dropoff addresses"
          >
            <ArrowUpDown size={15} color={colors.primaryDark} />
            <Text style={styles.swapText}>Swap</Text>
          </TouchableOpacity>
        </View>

        {/* Pickup Row */}
        <View style={styles.addressRow}>
          <View style={styles.pinCirclePickup}>
            <View style={styles.pinDotPickup} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>PICKUP POINT</Text>
            <Text style={styles.addressValue} numberOfLines={1}>
              {pickupAddress}
            </Text>
            <Text style={styles.addressSub}>Near Metro Pillar 84, Indiranagar</Text>
          </View>
        </View>

        <View style={styles.routeDividerLine} />

        {/* Dropoff Row */}
        <View style={styles.addressRow}>
          <View style={styles.pinCircleDropoff}>
            <View style={styles.pinDotDropoff} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>DELIVERY DESTINATION</Text>
            <Text style={styles.addressValue} numberOfLines={1}>
              {dropoffAddress}
            </Text>
            <Text style={styles.addressSub}>80ft Road, Sony World Signal, Koramangala</Text>
          </View>
        </View>

        <View style={styles.routeMetricsRow}>
          <View style={styles.metricPill}>
            <MapPin size={12} color={colors.primaryDark} />
            <Text style={styles.metricPillText}>{distanceKm} km estimated</Text>
          </View>
          <View style={styles.metricPill}>
            <Clock size={12} color={colors.primaryDark} />
            <Text style={styles.metricPillText}>~14 mins travel time</Text>
          </View>
        </View>
      </NeomorphCard>

      {/* Vehicle Selector */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Select Vehicle Class</Text>
        <Text style={styles.sectionSubtitle}>Porter-Grade Dispatch</Text>
      </View>

      <View style={styles.vehiclesGrid}>
        {VEHICLE_CATALOG.map((v) => {
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
                  {v.icon(isSelected ? colors.onDark : colors.primaryDark)}
                </View>
                <View style={styles.vehicleFareTag}>
                  <Text style={styles.vehicleFareText}>{formatPaise(v.baseFarePaise)}</Text>
                </View>
              </View>

              <Text style={styles.vehicleName}>{v.title}</Text>
              <Text style={styles.vehicleSub} numberOfLines={1}>
                {v.subtitle}
              </Text>

              <View style={styles.vehicleMetaRow}>
                <View style={styles.weightBadge}>
                  <Text style={styles.weightBadgeText}>Max {v.maxWeightKg} kg</Text>
                </View>
                <Text style={styles.vehicleEtaText}>~{v.etaMins}m away</Text>
              </View>

              {isSelected && (
                <View style={styles.selectedCheckPill}>
                  <Check size={11} color={colors.onPrimary} strokeWidth={3} />
                  <Text style={styles.selectedCheckText}>SELECTED</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cargo Category Chips */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Parcel Category</Text>
        <Text style={styles.sectionSubtitle}>Handles with Care</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CARGO_CATEGORIES.map((cat) => {
          const isCatSelected = cat === selectedCategory;
          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.85}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                isCatSelected && styles.categoryChipSelected,
              ]}
            >
              <Package
                size={14}
                color={isCatSelected ? colors.onDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  isCatSelected && styles.categoryChipTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Porter Add-ons */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Porter Add-Ons & Protection</Text>
      </View>

      <NeomorphCard style={styles.addonsCard}>
        {/* Loading Helper Add-on */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.addonRow}
          onPress={() => setHelperAddon(!helperAddon)}
        >
          <View style={styles.addonIconBox}>
            <User size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.addonCopy}>
            <View style={styles.addonTitleRow}>
              <Text style={styles.addonTitle}>Driver Loading Helper</Text>
              <Text style={styles.addonPrice}>
                +{selectedVehicle === 'pickup' ? '₹ 150.00' : '₹ 50.00'}
              </Text>
            </View>
            <Text style={styles.addonDesc}>
              Driver assists in carrying parcels from your doorstep to vehicle.
            </Text>
          </View>
          <View
            style={[
              styles.switchTrack,
              helperAddon && styles.switchTrackActive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                helperAddon && styles.switchThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.addonDivider} />

        {/* Transit Insurance Add-on */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.addonRow}
          onPress={() => setInsuranceAddon(!insuranceAddon)}
        >
          <View style={styles.addonIconBox}>
            <ShieldCheck size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.addonCopy}>
            <View style={styles.addonTitleRow}>
              <Text style={styles.addonTitle}>Package Transit Insurance</Text>
              <Text style={styles.addonPrice}>+₹ 15.00</Text>
            </View>
            <Text style={styles.addonDesc}>
              Full transit protection coverage up to ₹ 10,000 for lost or damaged goods.
            </Text>
          </View>
          <View
            style={[
              styles.switchTrack,
              insuranceAddon && styles.switchTrackActive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                insuranceAddon && styles.switchThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </NeomorphCard>
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
          setOverviewTab('send_parcel');
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
          setOverviewTab('send_parcel');
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
          setOverviewTab('send_parcel');
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

      {/* Book Delivery CTA */}
      <PillButton
        title={`Book Delivery • ${formatPaise(finalTotalPaise)}`}
        variant="dark"
        size="lg"
        icon={<ArrowRight size={19} color={colors.onDark} />}
        style={styles.bookDeliveryBtn}
        onPress={() => setCustomerState('finding_driver')}
      />
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
        pickupLabel="Indiranagar 100ft Rd"
        dropoffLabel="Koramangala 4th Block"
        distanceKm={distanceKm}
        durationMins={
          deliveryStep === 'driver_assigned' ? 4 : deliveryStep === 'in_transit' ? 8 : 1
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
          <Text style={styles.otpDigitValue}>{pickupOtp}</Text>
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
            <Text style={styles.pinValue}>{deliveryPin}</Text>
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
              <Text style={styles.stepLabelSub}>OTP {pickupOtp} verified by courier</Text>
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
            <Text style={styles.invoiceBookingId}>Booking ID: AT-84920</Text>
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
          setOverviewTab('send_parcel');
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
  // Main Return
  // ==========================================
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {renderTopAppBar()}

      {/* When in Explore Quote: Show the 3 Main Tabs */}
      {customerState === 'explore_quote' && (
        <View style={styles.tabBarContainer}>
          <PillTabs<OverviewTab>
            tabs={[
              { key: 'send_parcel', label: 'Send Parcel' },
              { key: 'saved_places', label: 'Saved Places' },
              { key: 'wallet_passes', label: 'Wallet' },
            ]}
            activeTab={overviewTab}
            onTabChange={setOverviewTab}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          customerState === 'explore_quote' && overviewTab === 'send_parcel' && styles.scrollContentWithDock,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {customerState === 'explore_quote' && (
          <>
            {overviewTab === 'send_parcel' && renderSendParcelTab()}
            {overviewTab === 'saved_places' && renderSavedPlacesTab()}
            {overviewTab === 'wallet_passes' && renderWalletPassesTab()}
          </>
        )}

        {customerState === 'booking_sheet' && renderBookingSheet()}
        {customerState === 'finding_driver' && renderFindingDriver()}
        {customerState === 'active_tracking' && renderActiveTracking()}
        {customerState === 'delivery_completed' && renderDeliveryCompleted()}
      </ScrollView>

      {/* Pinned Bottom Quote Dock */}
      {customerState === 'explore_quote' && overviewTab === 'send_parcel' && (
        <View style={[styles.quoteSummaryDock, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <NeomorphCard variant="mint" style={styles.quoteSummaryCard}>
            <View style={styles.quoteSummaryRow}>
              <View style={styles.quoteFareCol}>
                <Text style={styles.quoteFareLabel}>ESTIMATED FARE</Text>
                <Text style={styles.quoteFareValue}>{formatPaise(finalTotalPaise)}</Text>
                <Text style={styles.quoteFareBreakdown} numberOfLines={1} ellipsizeMode="tail">
                  {currentVehicleConfig.title} • {distanceKm} km
                  {helperAddon ? ' • Helper' : ''}
                  {insuranceAddon ? ' • Insured' : ''}
                </Text>
              </View>
              <PillButton
                title="Proceed"
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

      {/* Overlay Modals */}
      {renderChatModal()}
      {renderPodModal()}
      {renderCancelModal()}
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
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: sizes.xl,
    fontWeight: '800',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  // Route & Address Card
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
    backgroundColor: '#E8F9EC',
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
    borderColor: colors.primaryDark,
    backgroundColor: '#F8FCF8',
    ...theme.shadows.glowGreen,
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
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  selectedCheckText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.onPrimary,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    backgroundColor: colors.dark,
  },
  addonDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  // Quote Summary Bar
  // Pinned Quote Summary Dock
  quoteSummaryDock: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: 'rgba(14, 30, 18, 0.07)',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    ...theme.shadows.floating,
  },
  quoteSummaryCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.xl,
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
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
});
