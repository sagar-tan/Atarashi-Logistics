/**
 * packers-movers-modal.tsx
 * Production-Grade 3-Step House Shifting Flow Modal for Atarashi Logistics.
 * Modeled directly on Porter's battle-tested shifting workflow.
 *
 * Strict Neomorphic Light Mode:
 * - Canvas: Chalk (#F4F7F4)
 * - Elevated white cards (#FFFFFF) with dual soft shadows
 * - Vibrant light mint green (#6EE787 / #5EDB79) accents
 * - High-contrast rich charcoal (#111813)
 * - Capsule pill buttons (borderRadius: 9999)
 * - Strictly ZERO glassmorphism.
 *
 * Strict Financial Invariant:
 * - All monetary values stored and computed as integer PAISE (100 paise = ₹1.00).
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  Bed,
  Boxes,
  Building,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Clock,
  Info,
  MapPin,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Utensils,
  X,
} from 'lucide-react-native';

import { SlideToConfirm } from '@/components/slide-to-confirm';
import { theme } from '@/theme/theme';

const { colors, radius, shadows } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type BuildingAccessibility = 'lift' | 'no_lift' | 'ground_floor';

export type FloorOption =
  | 'Ground Floor'
  | '1st Floor'
  | '2nd Floor'
  | '3rd Floor'
  | '4th Floor'
  | '5th+ Floor';

export type InventoryCategory = 'hall' | 'bedroom' | 'kitchen' | 'others';

export type PackingOption = 'superior' | 'none';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface CatalogItem {
  id: string;
  name: string;
  category: InventoryCategory;
  subtitle: string;
  tag?: string;
  weightKg: number;
  isFragile?: boolean;
  needsDismantling?: boolean;
}

export interface SelectedItemSummary {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  weightKg: number;
}

export interface PackersMoversBookingDetails {
  serviceType: 'packers_and_movers';
  bookingId: string;
  createdAt: string;
  pickup: {
    address: string;
    floor: FloorOption;
    accessibility: BuildingAccessibility;
  };
  drop: {
    address: string;
    floor: FloorOption;
    accessibility: BuildingAccessibility;
  };
  items: SelectedItemSummary[];
  totalItemsCount: number;
  totalWeightKg: number;
  schedule: {
    date: string;
    dateLabel: string;
    timeOfDay: TimeOfDay;
    timeSlot: string;
  };
  packingOption: PackingOption;
  packingCostPaise: number;
  unpackingAddon: boolean;
  unpackingCostPaise: number;
  dismantlingAddon: boolean;
  dismantlingCostPaise: number;
  baseFarePaise: number;
  itemVolumeSurchargePaise: number;
  stairSurchargePaise: number;
  totalFarePaise: number;
  totalFareRupees: number;
}

export interface PackersMoversModalProps {
  visible: boolean;
  onClose: () => void;
  pickupAddress: string;
  dropAddress: string;
  onBookingConfirmed: (details: PackersMoversBookingDetails) => void;
}

// ==========================================
// STATIC CATALOG & CONFIGURATION
// ==========================================

export const SHIFTING_CATALOG: CatalogItem[] = [
  // Hall (10 items)
  {
    id: 'h_sofa_1',
    name: 'Single seater sofa',
    category: 'hall',
    subtitle: 'Armchair / single lounge chair',
    weightKg: 20,
  },
  {
    id: 'h_sofa_2',
    name: '2 seater sofa',
    category: 'hall',
    subtitle: 'Standard loveseat couch',
    weightKg: 40,
  },
  {
    id: 'h_sofa_3',
    name: '3 seater sofa',
    category: 'hall',
    subtitle: 'Full-length living room sofa',
    weightKg: 65,
    tag: 'Bulky',
  },
  {
    id: 'h_recliner',
    name: 'Recliner',
    category: 'hall',
    subtitle: 'Single plush motorized/manual recliner',
    weightKg: 45,
  },
  {
    id: 'h_chairs',
    name: 'Chairs',
    category: 'hall',
    subtitle: 'Dining or accent chairs (per piece)',
    weightKg: 7,
  },
  {
    id: 'h_center_table',
    name: 'Center Table',
    category: 'hall',
    subtitle: 'Coffee table with glass/wood surface',
    weightKg: 18,
    isFragile: true,
  },
  {
    id: 'h_dining_table',
    name: 'Dining Table',
    category: 'hall',
    subtitle: '4 to 6 seater dining table',
    weightKg: 50,
    needsDismantling: true,
    tag: 'Dismantle',
  },
  {
    id: 'h_tv',
    name: 'TV/Monitor',
    category: 'hall',
    subtitle: 'Flat screen TV/Monitor (32" - 65")',
    weightKg: 16,
    isFragile: true,
    tag: 'Fragile',
  },
  {
    id: 'h_cabinet',
    name: 'Cabinet',
    category: 'hall',
    subtitle: 'Bookshelf / TV display cabinet',
    weightKg: 40,
  },
  {
    id: 'h_mandir',
    name: 'Mandir',
    category: 'hall',
    subtitle: 'Pooja wooden or marble mandir',
    weightKg: 22,
    isFragile: true,
    tag: 'Sacred & Fragile',
  },

  // Bedroom (6 items)
  {
    id: 'b_king_bed',
    name: 'King Bed',
    category: 'bedroom',
    subtitle: 'King size bed frame & headboard',
    weightKg: 80,
    needsDismantling: true,
    tag: 'Dismantle',
  },
  {
    id: 'b_queen_bed',
    name: 'Queen Bed',
    category: 'bedroom',
    subtitle: 'Queen size bed frame & storage box',
    weightKg: 65,
    needsDismantling: true,
    tag: 'Dismantle',
  },
  {
    id: 'b_mattress',
    name: 'Mattress',
    category: 'bedroom',
    subtitle: 'Single or double comfort mattress',
    weightKg: 25,
  },
  {
    id: 'b_wardrobe',
    name: 'Wardrobe',
    category: 'bedroom',
    subtitle: '2 or 3 door wooden/steel almirah',
    weightKg: 85,
    needsDismantling: true,
    tag: 'Heavy',
  },
  {
    id: 'b_ac',
    name: 'AC',
    category: 'bedroom',
    subtitle: 'Indoor split / window AC unit',
    weightKg: 40,
    isFragile: true,
  },
  {
    id: 'b_dressing_table',
    name: 'Dressing Table',
    category: 'bedroom',
    subtitle: 'Vanity mirror unit with storage',
    weightKg: 35,
    isFragile: true,
    tag: 'Fragile',
  },

  // Kitchen (5 items)
  {
    id: 'k_refrigerator',
    name: 'Refrigerator',
    category: 'kitchen',
    subtitle: 'Single or double door fridge',
    weightKg: 60,
    isFragile: true,
    tag: 'Heavy Appliance',
  },
  {
    id: 'k_washing_machine',
    name: 'Washing Machine',
    category: 'kitchen',
    subtitle: 'Top or front load washer',
    weightKg: 55,
    tag: 'Heavy Appliance',
  },
  {
    id: 'k_microwave',
    name: 'Microwave',
    category: 'kitchen',
    subtitle: 'Countertop microwave / OTG oven',
    weightKg: 15,
    isFragile: true,
  },
  {
    id: 'k_gas_stove',
    name: 'Gas Stove',
    category: 'kitchen',
    subtitle: '2, 3 or 4 burner cooktop',
    weightKg: 9,
    isFragile: true,
  },
  {
    id: 'k_kitchen_boxes',
    name: 'Kitchen Box Cartons',
    category: 'kitchen',
    subtitle: 'Packed crockery, utensils & jars',
    weightKg: 14,
  },

  // Others (8 items)
  {
    id: 'o_study_table',
    name: 'Study Table / Desk',
    category: 'others',
    subtitle: 'Computer desk or study table',
    weightKg: 24,
  },
  {
    id: 'o_office_chair',
    name: 'Office Chair',
    category: 'others',
    subtitle: 'Ergonomic swivel work chair',
    weightKg: 15,
  },
  {
    id: 'o_shoe_rack',
    name: 'Shoe Rack',
    category: 'others',
    subtitle: 'Wooden / metal shoe cabinet',
    weightKg: 14,
  },
  {
    id: 'o_storage_box',
    name: 'Storage Box / Carton',
    category: 'others',
    subtitle: 'General shifting corrugated box',
    weightKg: 15,
  },
  {
    id: 'o_luggage',
    name: 'Luggage / Suitcase',
    category: 'others',
    subtitle: 'Large luggage bag or trunk',
    weightKg: 18,
  },
  {
    id: 'o_bicycle',
    name: 'Bicycle',
    category: 'others',
    subtitle: 'Adult or kids bicycle',
    weightKg: 14,
  },
  {
    id: 'o_water_purifier',
    name: 'Water Purifier (RO)',
    category: 'others',
    subtitle: 'Wall mounted RO drinking unit',
    weightKg: 10,
    isFragile: true,
  },
  {
    id: 'o_clothes_stand',
    name: 'Clothes Drying Stand',
    category: 'others',
    subtitle: 'Foldable steel cloth drying rack',
    weightKg: 6,
  },
];

const FLOOR_OPTIONS: FloorOption[] = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th+ Floor',
];

const TIME_SLOTS: Record<TimeOfDay, Array<{ id: string; label: string; badge?: string }>> = {
  morning: [
    { id: 'm1', label: '8:00 AM - 9:00 AM', badge: 'Fast filling' },
    { id: 'm2', label: '9:00 AM - 10:00 AM', badge: 'Popular' },
    { id: 'm3', label: '10:00 AM - 11:00 AM', badge: 'Available' },
    { id: 'm4', label: '11:00 AM - 12:00 PM', badge: 'Available' },
  ],
  afternoon: [
    { id: 'a1', label: '12:00 PM - 1:00 PM', badge: 'Available' },
    { id: 'a2', label: '1:00 PM - 2:00 PM', badge: 'Available' },
    { id: 'a3', label: '2:00 PM - 3:00 PM', badge: 'Available' },
    { id: 'a4', label: '3:00 PM - 4:00 PM', badge: 'Available' },
  ],
  evening: [
    { id: 'e1', label: '4:00 PM - 5:00 PM', badge: 'Available' },
    { id: 'e2', label: '5:00 PM - 6:00 PM', badge: 'Popular' },
    { id: 'e3', label: '6:00 PM - 7:00 PM', badge: 'Available' },
  ],
};

const FAQS = [
  {
    question: 'How is the shifting fare calculated?',
    answer:
      'The fare is determined by distance, inventory volume/weight, floor level, and elevator accessibility. Multi-layer bubble packing and unpacking can be optionally selected. All rates are 100% transparent with zero hidden fees.',
  },
  {
    question: 'What is included in Superior Multi-Layer packing (₹499)?',
    answer:
      'Superior packing uses high-grade bubble wrap for electronics, heavy 3-ply corrugated sheets for wooden furniture, foam edge protectors, and waterproof stretch film to guarantee 100% damage-free transit.',
  },
  {
    question: 'What if my apartment does not have a lift?',
    answer:
      'If there is no elevator and goods need to be manually carried up or down stairs above the ground floor, a nominal stair-carry assistance surcharge (₹150) is included to compensate our ground crew.',
  },
  {
    question: 'Can I reschedule or cancel my booking?',
    answer:
      'Yes, you can reschedule or cancel for free up to 4 hours before your scheduled time slot directly from the app or by calling our shifting coordinator.',
  },
  {
    question: 'When do I need to pay for shifting?',
    answer:
      'You pay zero upfront advance. Full payment is made only after your goods are safely placed in your new house. You can pay via UPI, Card, or Cash.',
  },
];

// Helper: generate next 5 schedule dates with dynamic base pricing (in paise)
function generateUpcomingDates() {
  const dates = [];
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  for (let i = 0; i < 5; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = dayNames[d.getDay()];
    const monthName = monthNames[d.getMonth()];
    const dateNum = d.getDate();

    let dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName;
    let fullLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName}, ${dateNum} ${monthName}`;
    const isoDate = d.toISOString().split('T')[0];

    // Dynamic base fare in paise
    let baseFarePaise = 249900; // ₹2,499.00
    if (i === 0) {
      baseFarePaise = 299900; // ₹2,999 today surge
    } else if (i === 1) {
      baseFarePaise = 269900; // ₹2,699 tomorrow
    } else if (d.getDay() === 0 || d.getDay() === 6) {
      baseFarePaise = 279900; // ₹2,799 weekend
    } else {
      baseFarePaise = 239900; // ₹2,399 weekday discount
    }

    dates.push({
      index: i,
      isoDate,
      dayLabel,
      dateNum,
      monthName,
      fullLabel,
      baseFarePaise,
    });
  }
  return dates;
}

// ==========================================
// COMPONENT IMPLEMENTATION
// ==========================================

export function PackersMoversModal({
  visible,
  onClose,
  pickupAddress,
  dropAddress,
  onBookingConfirmed,
}: PackersMoversModalProps) {
  const insets = useSafeAreaInsets();

  // Workflow Step: 1 = Moving details, 2 = Add items, 3 = Schedule & Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Moving details state
  const [pickupAddr, setPickupAddr] = useState(
    pickupAddress || '14th Main, 4th Cross, Indiranagar, Bengaluru'
  );
  const [dropAddr, setDropAddr] = useState(
    dropAddress || 'Flat 402, Prestige Lakeside, Bellandur, Bengaluru'
  );
  const [pickupFloor, setPickupFloor] = useState<FloorOption>('2nd Floor');
  const [dropFloor, setDropFloor] = useState<FloorOption>('3rd Floor');
  const [pickupAccessibility, setPickupAccessibility] =
    useState<BuildingAccessibility>('lift');
  const [dropAccessibility, setDropAccessibility] =
    useState<BuildingAccessibility>('lift');

  // Step 2: Inventory Catalog state
  const [activeCategory, setActiveCategory] = useState<InventoryCategory>('hall');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({
    h_sofa_2: 1,
    h_center_table: 1,
    h_tv: 1,
    b_queen_bed: 1,
    b_mattress: 1,
    k_refrigerator: 1,
  });

  // Step 3: Schedule state
  const upcomingDates = useMemo(() => generateUpcomingDates(), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(1); // default Tomorrow
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('morning');
  const [selectedSlotId, setSelectedSlotId] = useState('m2'); // 9AM - 10AM
  const [packingOption, setPackingOption] = useState<PackingOption>('superior');
  const [unpackingAddon, setUnpackingAddon] = useState(true);
  const [dismantlingAddon, setDismantlingAddon] = useState(false);

  // Help & FAQs state
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Booking completion state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // INVENTORY CALCULATIONS
  // ==========================================

  const selectedItemsList: SelectedItemSummary[] = useMemo(() => {
    return SHIFTING_CATALOG.filter((item) => (itemQuantities[item.id] || 0) > 0).map(
      (item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: itemQuantities[item.id] || 0,
        weightKg: item.weightKg,
      })
    );
  }, [itemQuantities]);

  const totalItemsCount = useMemo(() => {
    return selectedItemsList.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [selectedItemsList]);

  const totalWeightKg = useMemo(() => {
    return selectedItemsList.reduce(
      (acc, curr) => acc + curr.quantity * curr.weightKg,
      0
    );
  }, [selectedItemsList]);

  // Count items per category for badge
  const categoryCounts = useMemo(() => {
    const counts: Record<InventoryCategory, number> = {
      hall: 0,
      bedroom: 0,
      kitchen: 0,
      others: 0,
    };
    selectedItemsList.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return counts;
  }, [selectedItemsList]);

  // Filtered items in Step 2
  const visibleItems = useMemo(() => {
    let list = SHIFTING_CATALOG;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.subtitle.toLowerCase().includes(q) ||
          (i.tag && i.tag.toLowerCase().includes(q))
      );
    }
    return list.filter((i) => i.category === activeCategory);
  }, [activeCategory, searchQuery]);

  // ==========================================
  // FINANCIAL CALCULATIONS (STRICT PAISE)
  // ==========================================

  const selectedDate = upcomingDates[selectedDateIndex] || upcomingDates[0];
  const baseFarePaise = selectedDate.baseFarePaise;

  // Additional items surcharge over 5 items: ₹80 per item (8000 paise)
  const itemVolumeSurchargePaise = useMemo(() => {
    if (totalItemsCount <= 5) return 0;
    return (totalItemsCount - 5) * 8000;
  }, [totalItemsCount]);

  // Stair surcharge: ₹150 (15000 paise) if No Lift and floor != Ground
  const stairSurchargePaise = useMemo(() => {
    let charge = 0;
    if (pickupAccessibility === 'no_lift' && pickupFloor !== 'Ground Floor') {
      charge += 15000;
    }
    if (dropAccessibility === 'no_lift' && dropFloor !== 'Ground Floor') {
      charge += 15000;
    }
    return charge;
  }, [pickupAccessibility, pickupFloor, dropAccessibility, dropFloor]);

  // Packing cost: Superior Multi-Layer packing = ₹499 (49900 paise)
  const packingCostPaise = packingOption === 'superior' ? 49900 : 0;

  // Unpacking add-on = ₹199 (19900 paise)
  const unpackingCostPaise = unpackingAddon ? 19900 : 0;

  // Dismantling add-on = ₹299 (29900 paise)
  const dismantlingCostPaise = dismantlingAddon ? 29900 : 0;

  // Total Fare in integer Paise
  const totalFarePaise = useMemo(() => {
    return (
      baseFarePaise +
      itemVolumeSurchargePaise +
      stairSurchargePaise +
      packingCostPaise +
      unpackingCostPaise +
      dismantlingCostPaise
    );
  }, [
    baseFarePaise,
    itemVolumeSurchargePaise,
    stairSurchargePaise,
    packingCostPaise,
    unpackingCostPaise,
    dismantlingCostPaise,
  ]);

  const totalFareRupees = Math.round(totalFarePaise / 100);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleBack = () => {
    if (currentStep === 1) {
      onClose();
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleUpdateItemQuantity = (id: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const handleConfirmBooking = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const slotObj =
      TIME_SLOTS[selectedTimeOfDay].find((s) => s.id === selectedSlotId) ||
      TIME_SLOTS[selectedTimeOfDay][0];

    const bookingDetails: PackersMoversBookingDetails = {
      serviceType: 'packers_and_movers',
      bookingId: `AT-PM-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      pickup: {
        address: pickupAddr,
        floor: pickupFloor,
        accessibility: pickupAccessibility,
      },
      drop: {
        address: dropAddr,
        floor: dropFloor,
        accessibility: dropAccessibility,
      },
      items: selectedItemsList,
      totalItemsCount,
      totalWeightKg,
      schedule: {
        date: selectedDate.isoDate,
        dateLabel: selectedDate.fullLabel,
        timeOfDay: selectedTimeOfDay,
        timeSlot: slotObj.label,
      },
      packingOption,
      packingCostPaise,
      unpackingAddon,
      unpackingCostPaise,
      dismantlingAddon,
      dismantlingCostPaise,
      baseFarePaise,
      itemVolumeSurchargePaise,
      stairSurchargePaise,
      totalFarePaise,
      totalFareRupees,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onBookingConfirmed(bookingDetails);
      onClose();
    }, 400);
  };

  // House size estimation hint
  const homeSizeEstimate = useMemo(() => {
    if (totalItemsCount <= 3) return 'Few items • Tata Ace mini';
    if (totalItemsCount <= 8) return '1 BHK equivalent • 8ft Truck';
    if (totalItemsCount <= 16) return '2 BHK equivalent • 14ft Tata 407';
    return '3+ BHK equivalent • 17ft Closed Container';
  }, [totalItemsCount]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderCategoryIcon = (cat: InventoryCategory, color: string) => {
    switch (cat) {
      case 'hall':
        return <Armchair size={16} color={color} />;
      case 'bedroom':
        return <Bed size={16} color={color} />;
      case 'kitchen':
        return <Utensils size={16} color={color} />;
      case 'others':
        return <Boxes size={16} color={color} />;
    }
  };

  // ==========================================
  // STEP 1: MOVING DETAILS
  // ==========================================
  const renderStep1MovingDetails = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Intro Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBannerIconWrap}>
          <Truck size={24} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroBannerTitle}>Dedicated Shifting Vehicle</Text>
          <Text style={styles.heroBannerSubtitle}>
            Trained 2-3 man crew, sanitized container truck & doorstep loading
          </Text>
        </View>
      </View>

      {/* Pickup Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.dotBadge, { backgroundColor: colors.primary }]}>
            <MapPin size={14} color={colors.dark} />
          </View>
          <Text style={styles.cardSectionTitle}>PICKUP LOCATION</Text>
        </View>

        <TextInput
          style={styles.addressInput}
          value={pickupAddr}
          onChangeText={setPickupAddr}
          placeholder="Enter complete pickup address with flat/house no."
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Text style={styles.subSectionTitle}>Floor Level</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChipsRow}
        >
          {FLOOR_OPTIONS.map((floor) => {
            const isSelected = pickupFloor === floor;
            return (
              <TouchableOpacity
                key={`p-floor-${floor}`}
                style={[
                  styles.chipPill,
                  isSelected && styles.chipPillActive,
                ]}
                onPress={() => setPickupFloor(floor)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipPillText,
                    isSelected && styles.chipPillTextActive,
                  ]}
                >
                  {floor}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.subSectionTitle}>Building Accessibility</Text>
        <View style={styles.accessibilityRow}>
          <TouchableOpacity
            style={[
              styles.accessChip,
              pickupAccessibility === 'lift' && styles.accessChipActive,
            ]}
            onPress={() => setPickupAccessibility('lift')}
            activeOpacity={0.8}
          >
            <Building2
              size={16}
              color={
                pickupAccessibility === 'lift'
                  ? colors.dark
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.accessChipText,
                pickupAccessibility === 'lift' && styles.accessChipTextActive,
              ]}
            >
              Lift available
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accessChip,
              pickupAccessibility === 'no_lift' && styles.accessChipActive,
            ]}
            onPress={() => setPickupAccessibility('no_lift')}
            activeOpacity={0.8}
          >
            <Building
              size={16}
              color={
                pickupAccessibility === 'no_lift'
                  ? colors.dark
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.accessChipText,
                pickupAccessibility === 'no_lift' && styles.accessChipTextActive,
              ]}
            >
              No lift
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accessChip,
              pickupAccessibility === 'ground_floor' && styles.accessChipActive,
            ]}
            onPress={() => {
              setPickupAccessibility('ground_floor');
              setPickupFloor('Ground Floor');
            }}
            activeOpacity={0.8}
          >
            <CheckCircle2
              size={16}
              color={
                pickupAccessibility === 'ground_floor'
                  ? colors.dark
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.accessChipText,
                pickupAccessibility === 'ground_floor' &&
                  styles.accessChipTextActive,
              ]}
            >
              Ground floor
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Drop Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.dotBadge, { backgroundColor: colors.dark }]}>
            <MapPin size={14} color={colors.onDark} />
          </View>
          <Text style={styles.cardSectionTitle}>DROP LOCATION</Text>
        </View>

        <TextInput
          style={styles.addressInput}
          value={dropAddr}
          onChangeText={setDropAddr}
          placeholder="Enter complete drop address with apartment/society"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Text style={styles.subSectionTitle}>Floor Level</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChipsRow}
        >
          {FLOOR_OPTIONS.map((floor) => {
            const isSelected = dropFloor === floor;
            return (
              <TouchableOpacity
                key={`d-floor-${floor}`}
                style={[
                  styles.chipPill,
                  isSelected && styles.chipPillActive,
                ]}
                onPress={() => setDropFloor(floor)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipPillText,
                    isSelected && styles.chipPillTextActive,
                  ]}
                >
                  {floor}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.subSectionTitle}>Building Accessibility</Text>
        <View style={styles.accessibilityRow}>
          <TouchableOpacity
            style={[
              styles.accessChip,
              dropAccessibility === 'lift' && styles.accessChipActive,
            ]}
            onPress={() => setDropAccessibility('lift')}
            activeOpacity={0.8}
          >
            <Building2
              size={16}
              color={
                dropAccessibility === 'lift'
                  ? colors.dark
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.accessChipText,
                dropAccessibility === 'lift' && styles.accessChipTextActive,
              ]}
            >
              Lift available
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accessChip,
              dropAccessibility === 'no_lift' && styles.accessChipActive,
            ]}
            onPress={() => setDropAccessibility('no_lift')}
            activeOpacity={0.8}
          >
            <Building
              size={16}
              color={
                dropAccessibility === 'no_lift'
                  ? colors.dark
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.accessChipText,
                dropAccessibility === 'no_lift' && styles.accessChipTextActive,
              ]}
            >
              No lift
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accessChip,
              dropAccessibility === 'ground_floor' && styles.accessChipActive,
            ]}
            onPress={() => {
              setDropAccessibility('ground_floor');
              setDropFloor('Ground Floor');
            }}
            activeOpacity={0.8}
          >
            <CheckCircle2
              size={16}
              color={
                dropAccessibility === 'ground_floor'
                  ? colors.dark
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.accessChipText,
                dropAccessibility === 'ground_floor' &&
                  styles.accessChipTextActive,
              ]}
            >
              Ground floor
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trust & Guarantees */}
      <View style={styles.trustBanner}>
        <View style={styles.trustItem}>
          <ShieldCheck size={20} color={colors.primaryDark} />
          <Text style={styles.trustItemText}>Zero Damage Guarantee</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Sparkles size={20} color={colors.primaryDark} />
          <Text style={styles.trustItemText}>Professional Movers</Text>
        </View>
      </View>
    </ScrollView>
  );

  // ==========================================
  // STEP 2: ADD ITEMS (INVENTORY CATALOG)
  // ==========================================
  const renderStep2AddItems = () => (
    <View style={styles.stepContainer}>
      {/* Search Input Bar */}
      <View style={styles.searchBarWrap}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sofa, bed, fridge, boxes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Pills (When not searching) */}
      {searchQuery.trim().length === 0 && (
        <View style={styles.categoriesRow}>
          {(['hall', 'bedroom', 'kitchen', 'others'] as InventoryCategory[]).map(
            (cat) => {
              const isSelected = activeCategory === cat;
              const count = categoryCounts[cat];
              const label =
                cat === 'hall'
                  ? 'Hall'
                  : cat === 'bedroom'
                  ? 'Bedroom'
                  : cat === 'kitchen'
                  ? 'Kitchen'
                  : 'Others';

              return (
                <TouchableOpacity
                  key={`cat-${cat}`}
                  style={[
                    styles.categoryPill,
                    isSelected && styles.categoryPillActive,
                  ]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.8}
                >
                  {renderCategoryIcon(
                    cat,
                    isSelected ? colors.dark : colors.textSecondary
                  )}
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.catBadge,
                        isSelected
                          ? styles.catBadgeActive
                          : styles.catBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catBadgeText,
                          isSelected && styles.catBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </View>
      )}

      {/* Inventory Item List */}
      <ScrollView
        style={styles.stepScrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.length === 0 ? (
          <View style={styles.emptyStateWrap}>
            <Boxes size={40} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No items found</Text>
            <Text style={styles.emptyStateSubtitle}>
              Try searching for something else like "sofa", "bed", or "fridge"
            </Text>
          </View>
        ) : (
          visibleItems.map((item) => {
            const count = itemQuantities[item.id] || 0;
            return (
              <View key={`item-${item.id}`} style={styles.inventoryCard}>
                <View style={styles.inventoryCardLeft}>
                  <View style={styles.itemIconWrap}>
                    {renderCategoryIcon(item.category, colors.dark)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      {item.tag && (
                        <View style={styles.itemTagPill}>
                          <Text style={styles.itemTagText}>{item.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    <Text style={styles.itemMetaHint}>
                      ~{item.weightKg} kg{item.isFragile ? ' • Fragile' : ''}
                      {item.needsDismantling ? ' • Dismantle included' : ''}
                    </Text>
                  </View>
                </View>

                {/* Counter Stepper or Add Button */}
                <View style={styles.counterWrap}>
                  {count === 0 ? (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleUpdateItemQuantity(item.id, 1)}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color={colors.dark} />
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateItemQuantity(item.id, -1)}
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color={colors.dark} />
                      </TouchableOpacity>
                      <View style={styles.stepperCountWrap}>
                        <Text style={styles.stepperCountText}>{count}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateItemQuantity(item.id, 1)}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={colors.dark} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  // ==========================================
  // STEP 3: SCHEDULE & REVIEW
  // ==========================================
  const renderStep3Schedule = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Picker Header */}
      <View style={styles.sectionHeaderRow}>
        <Calendar size={18} color={colors.primaryDark} />
        <Text style={styles.step3SectionTitle}>Select Shifting Date</Text>
      </View>

      {/* Horizontal Date Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalDatesScroll}
      >
        {upcomingDates.map((item, idx) => {
          const isSelected = selectedDateIndex === idx;
          const displayRupees = Math.round(item.baseFarePaise / 100);

          return (
            <TouchableOpacity
              key={`date-chip-${item.isoDate}`}
              style={[
                styles.dateChipCard,
                isSelected && styles.dateChipCardActive,
              ]}
              onPress={() => setSelectedDateIndex(idx)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.dateChipDayLabel,
                  isSelected && styles.dateChipDayLabelActive,
                ]}
              >
                {item.dayLabel}
              </Text>
              <Text
                style={[
                  styles.dateChipNumber,
                  isSelected && styles.dateChipNumberActive,
                ]}
              >
                {item.dateNum} {item.monthName}
              </Text>
              <View
                style={[
                  styles.dateChipPricePill,
                  isSelected && styles.dateChipPricePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateChipPriceText,
                    isSelected && styles.dateChipPriceTextActive,
                  ]}
                >
                  ₹{displayRupees.toLocaleString('en-IN')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Time of Day Tabs */}
      <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
        <Clock size={18} color={colors.primaryDark} />
        <Text style={styles.step3SectionTitle}>Pickup Slot</Text>
      </View>

      <View style={styles.timeOfDayTabsWrap}>
        {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((tod) => {
          const isSelected = selectedTimeOfDay === tod;
          const label =
            tod === 'morning'
              ? 'Morning (8AM-12PM)'
              : tod === 'afternoon'
              ? 'Afternoon (12PM-4PM)'
              : 'Evening (4PM-7PM)';

          return (
            <TouchableOpacity
              key={`tod-${tod}`}
              style={[
                styles.timeOfDayTab,
                isSelected && styles.timeOfDayTabActive,
              ]}
              onPress={() => {
                setSelectedTimeOfDay(tod);
                setSelectedSlotId(TIME_SLOTS[tod][0].id);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.timeOfDayTabText,
                  isSelected && styles.timeOfDayTabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hourly Slots Radio Cards */}
      <View style={styles.slotsContainer}>
        {TIME_SLOTS[selectedTimeOfDay].map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <TouchableOpacity
              key={`slot-${slot.id}`}
              style={[
                styles.slotRadioCard,
                isSelected && styles.slotRadioCardActive,
              ]}
              onPress={() => setSelectedSlotId(slot.id)}
              activeOpacity={0.8}
            >
              <View style={styles.slotRadioLeft}>
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleActive,
                  ]}
                >
                  {isSelected && <View style={styles.radioDotInner} />}
                </View>
                <Text
                  style={[
                    styles.slotLabelText,
                    isSelected && styles.slotLabelTextActive,
                  ]}
                >
                  {slot.label}
                </Text>
              </View>

              {slot.badge && (
                <View
                  style={[
                    styles.slotBadgePill,
                    slot.badge === 'Fast filling'
                      ? styles.slotBadgeAlert
                      : isSelected
                      ? styles.slotBadgeActive
                      : styles.slotBadgeMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotBadgeText,
                      slot.badge === 'Fast filling'
                        ? styles.slotBadgeAlertText
                        : isSelected
                        ? styles.slotBadgeActiveText
                        : styles.slotBadgeMutedText,
                    ]}
                  >
                    {slot.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Packing Options */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Package size={18} color={colors.primaryDark} />
        <Text style={styles.step3SectionTitle}>Packing Options</Text>
      </View>

      {/* Option 1: Superior Multi-layer packing */}
      <TouchableOpacity
        style={[
          styles.packingCard,
          packingOption === 'superior' && styles.packingCardActive,
        ]}
        onPress={() => setPackingOption('superior')}
        activeOpacity={0.85}
      >
        <View style={styles.packingCardHeader}>
          <View style={styles.slotRadioLeft}>
            <View
              style={[
                styles.radioCircle,
                packingOption === 'superior' && styles.radioCircleActive,
              ]}
            >
              {packingOption === 'superior' && (
                <View style={styles.radioDotInner} />
              )}
            </View>
            <View>
              <View style={styles.packingTitleRow}>
                <Text style={styles.packingTitle}>
                  SUPERIOR Multi-layer packing
                </Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                </View>
              </View>
              <Text style={styles.packingPriceTag}>
                ₹499 (Included bubble wrap & 3-ply sheets)
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.packingDescription}>
          Heavy duty bubble wrap for electronics, 3-ply corrugated sheets for
          furniture, edge foam protectors & waterproof stretch film for zero
          transit damage.
        </Text>
      </TouchableOpacity>

      {/* Option 2: No packing */}
      <TouchableOpacity
        style={[
          styles.packingCard,
          packingOption === 'none' && styles.packingCardActive,
          { marginTop: 10 },
        ]}
        onPress={() => setPackingOption('none')}
        activeOpacity={0.85}
      >
        <View style={styles.packingCardHeader}>
          <View style={styles.slotRadioLeft}>
            <View
              style={[
                styles.radioCircle,
                packingOption === 'none' && styles.radioCircleActive,
              ]}
            >
              {packingOption === 'none' && (
                <View style={styles.radioDotInner} />
              )}
            </View>
            <View>
              <Text style={styles.packingTitle}>No packing</Text>
              <Text style={styles.packingPriceTag}>₹0</Text>
            </View>
          </View>
        </View>
        <Text style={styles.packingDescription}>
          Transported directly as-is without packing material. Blankets and
          straps used inside the truck.
        </Text>
      </TouchableOpacity>

      {/* Optional Add-on: Unpacking */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Sparkles size={18} color={colors.primaryDark} />
        <Text style={styles.step3SectionTitle}>Optional Add-ons</Text>
      </View>

      <TouchableOpacity
        style={[styles.addonCard, unpackingAddon && styles.addonCardActive]}
        onPress={() => setUnpackingAddon(!unpackingAddon)}
        activeOpacity={0.85}
      >
        <View style={styles.addonCardContent}>
          <View
            style={[
              styles.checkboxBox,
              unpackingAddon && styles.checkboxBoxActive,
            ]}
          >
            {unpackingAddon && <Check size={14} color={colors.dark} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.addonTitleRow}>
              <Text style={styles.addonTitle}>Unpacking all items</Text>
              <Text style={styles.addonPrice}>+₹199</Text>
            </View>
            <Text style={styles.addonSubtitle}>
              Crew unboxes cartons and places items in respective destination
              rooms.
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.addonCard,
          dismantlingAddon && styles.addonCardActive,
          { marginTop: 10 },
        ]}
        onPress={() => setDismantlingAddon(!dismantlingAddon)}
        activeOpacity={0.85}
      >
        <View style={styles.addonCardContent}>
          <View
            style={[
              styles.checkboxBox,
              dismantlingAddon && styles.checkboxBoxActive,
            ]}
          >
            {dismantlingAddon && <Check size={14} color={colors.dark} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.addonTitleRow}>
              <Text style={styles.addonTitle}>Carpentry & Reassembly</Text>
              <Text style={styles.addonPrice}>+₹299</Text>
            </View>
            <Text style={styles.addonSubtitle}>
              Specialist carpenter dismantles beds/wardrobes at pickup &
              reassembles at drop.
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Fare Summary Breakdown */}
      <View style={styles.fareBreakdownCard}>
        <Text style={styles.breakdownHeaderTitle}>Fare Summary</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Base Shifting Vehicle Fare</Text>
          <Text style={styles.breakdownValue}>
            ₹{Math.round(baseFarePaise / 100).toLocaleString('en-IN')}
          </Text>
        </View>

        {itemVolumeSurchargePaise > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Extra Inventory Volume ({totalItemsCount - 5} items)
            </Text>
            <Text style={styles.breakdownValue}>
              +₹{Math.round(itemVolumeSurchargePaise / 100).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {stairSurchargePaise > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Stair Carry Assistance (No lift)
            </Text>
            <Text style={styles.breakdownValue}>
              +₹{Math.round(stairSurchargePaise / 100).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Packing Charges ({packingOption === 'superior' ? 'Superior' : 'None'})
          </Text>
          <Text style={styles.breakdownValue}>
            {packingCostPaise > 0
              ? `+₹${Math.round(packingCostPaise / 100)}`
              : 'FREE'}
          </Text>
        </View>

        {unpackingAddon && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Unpacking Service</Text>
            <Text style={styles.breakdownValue}>
              +₹{Math.round(unpackingCostPaise / 100)}
            </Text>
          </View>
        )}

        {dismantlingAddon && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Carpentry & Dismantling</Text>
            <Text style={styles.breakdownValue}>
              +₹{Math.round(dismantlingCostPaise / 100)}
            </Text>
          </View>
        )}

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownTotalRow}>
          <View>
            <Text style={styles.breakdownTotalLabel}>Estimated Total</Text>
            <Text style={styles.breakdownSubtext}>Inclusive of all taxes</Text>
          </View>
          <Text style={styles.breakdownTotalValue}>
            ₹{totalFareRupees.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.paymentTermsCallout}>
          <CheckCircle2 size={16} color={colors.primaryDark} />
          <Text style={styles.paymentTermsText}>
            Zero advance required. Pay full ₹
            {totalFareRupees.toLocaleString('en-IN')} after shifting completion.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // ==========================================
  // HELP & FAQS MODAL
  // ==========================================
  const renderHelpFaqsModal = () => (
    <Modal
      visible={faqModalVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setFaqModalVisible(false)}
    >
      <View style={styles.faqModalOverlay}>
        <View style={styles.faqModalCard}>
          {/* Header */}
          <View style={styles.faqModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CircleHelp size={20} color={colors.primaryDark} />
              <Text style={styles.faqModalTitle}>House Shifting Help & FAQs</Text>
            </View>
            <TouchableOpacity
              onPress={() => setFaqModalVisible(false)}
              style={styles.faqCloseBtn}
            >
              <X size={20} color={colors.dark} />
            </TouchableOpacity>
          </View>

          {/* FAQ List */}
          <ScrollView
            style={styles.faqScrollView}
            showsVerticalScrollIndicator={false}
          >
            {FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <View key={`faq-${idx}`} style={styles.faqItemCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <ChevronDown
                      size={18}
                      color={colors.textSecondary}
                      style={{
                        transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                      }}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  )}
                </View>
              );
            })}

            <View style={styles.faqSupportCallout}>
              <Text style={styles.faqSupportTitle}>Need shifting assistance?</Text>
              <Text style={styles.faqSupportDesc}>
                Our moving coordinators are available 7 AM to 10 PM daily.
              </Text>
            </View>
          </ScrollView>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.faqGotItBtn}
            onPress={() => setFaqModalVisible(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.faqGotItBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleBack}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <ArrowLeft size={22} color={colors.dark} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>House Shifting</Text>
            <Text style={styles.headerSubtitle}>
              {currentStep === 1
                ? 'Step 1 of 3 • Moving Details'
                : currentStep === 2
                ? 'Step 2 of 3 • Select Inventory'
                : 'Step 3 of 3 • Schedule & Review'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.faqTriggerBtn}
            onPress={() => setFaqModalVisible(true)}
            activeOpacity={0.8}
          >
            <CircleHelp size={16} color={colors.dark} />
            <Text style={styles.faqTriggerText}>Help & FAQs</Text>
          </TouchableOpacity>
        </View>

        {/* Stepper Progress Bar */}
        <View style={styles.stepperContainerBar}>
          {/* Step 1 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep >= 1 && styles.stepCircleActive,
                currentStep > 1 && styles.stepCircleCompleted,
              ]}
            >
              {currentStep > 1 ? (
                <Check size={12} color={colors.dark} />
              ) : (
                <Text
                  style={[
                    styles.stepCircleNumber,
                    currentStep >= 1 && styles.stepCircleNumberActive,
                  ]}
                >
                  1
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= 1 && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              Moving details
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.stepConnectorLine,
              currentStep >= 2 && styles.stepConnectorLineActive,
            ]}
          />

          {/* Step 2 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep >= 2 && styles.stepCircleActive,
                currentStep > 2 && styles.stepCircleCompleted,
              ]}
            >
              {currentStep > 2 ? (
                <Check size={12} color={colors.dark} />
              ) : (
                <Text
                  style={[
                    styles.stepCircleNumber,
                    currentStep >= 2 && styles.stepCircleNumberActive,
                  ]}
                >
                  2
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= 2 && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              Add items
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.stepConnectorLine,
              currentStep >= 3 && styles.stepConnectorLineActive,
            ]}
          />

          {/* Step 3 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => {
              if (totalItemsCount > 0) setCurrentStep(3);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep >= 3 && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepCircleNumber,
                  currentStep >= 3 && styles.stepCircleNumberActive,
                ]}
              >
                3
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= 3 && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content of Active Step */}
        <View style={styles.bodyWrap}>
          {currentStep === 1 && renderStep1MovingDetails()}
          {currentStep === 2 && renderStep2AddItems()}
          {currentStep === 3 && renderStep3Schedule()}
        </View>

        {/* Bottom CTA Bar */}
        <View
          style={[
            styles.bottomStickyBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 },
          ]}
        >
          {currentStep === 1 && (
            <TouchableOpacity
              style={styles.primaryPillBtn}
              onPress={() => setCurrentStep(2)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryPillBtnText}>
                Check Price & Add Items →
              </Text>
            </TouchableOpacity>
          )}

          {currentStep === 2 && (
            <View style={styles.step2BottomRow}>
              <View style={styles.step2SummaryLeft}>
                <Text style={styles.step2ItemsCount}>
                  {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}{' '}
                  Added
                </Text>
                <Text style={styles.step2HomeEstimate}>{homeSizeEstimate}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.step2ProceedBtn,
                  totalItemsCount === 0 && styles.step2ProceedBtnDisabled,
                ]}
                onPress={() => {
                  if (totalItemsCount > 0) {
                    setCurrentStep(3);
                  }
                }}
                disabled={totalItemsCount === 0}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.step2ProceedBtnText,
                    totalItemsCount === 0 && styles.step2ProceedBtnTextDisabled,
                  ]}
                >
                  Proceed to Schedule →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 3 && (
            <View style={{ width: '100%', gap: 10 }}>
              <SlideToConfirm
                onConfirm={handleConfirmBooking}
                text={`Slide to Book • ₹${totalFareRupees.toLocaleString('en-IN')}`}
                confirmedText="Shifting Confirmed ✓"
              />
              <TouchableOpacity
                style={styles.confirmPillFallbackBtn}
                onPress={handleConfirmBooking}
                activeOpacity={0.88}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.dark} />
                ) : (
                  <Text style={styles.confirmPillFallbackText}>
                    Confirm Shifting Booking • ₹
                    {totalFareRupees.toLocaleString('en-IN')} →
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Help & FAQs Sheet */}
        {renderHelpFaqsModal()}
      </View>
    </Modal>
  );
}

// ==========================================
// NEOMORPHIC STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Chalk #F4F7F4
  },
  bodyWrap: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ---------------- HEADER ----------------
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.button,
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  faqTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.button,
  },
  faqTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // ---------------- STEPPER ----------------
  stepperContainerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  stepCircleNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  stepCircleNumberActive: {
    color: colors.dark,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  stepConnectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  stepConnectorLineActive: {
    backgroundColor: colors.primary,
  },

  // ---------------- STEP 1: MOVING DETAILS ----------------
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroBannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dotBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  addressInput: {
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  horizontalChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipPillTextActive: {
    color: colors.dark,
    fontWeight: '800',
  },

  accessibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accessChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accessChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  accessChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  accessChipTextActive: {
    color: colors.dark,
    fontWeight: '800',
  },

  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  trustDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },

  // ---------------- STEP 2: INVENTORY CATALOG ----------------
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: colors.dark,
    fontWeight: '800',
  },
  catBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  catBadgeActive: {
    backgroundColor: colors.dark,
  },
  catBadgeInactive: {
    backgroundColor: colors.surfaceSubtle,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  catBadgeTextActive: {
    color: colors.primary,
  },

  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  inventoryCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  itemTagPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  itemTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  itemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemMetaHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  counterWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    ...shadows.button,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  stepperCountWrap: {
    paddingHorizontal: 10,
  },
  stepperCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  emptyStateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ---------------- STEP 3: SCHEDULE ----------------
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  step3SectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  horizontalDatesScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  dateChipCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  dateChipCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryDark,
  },
  dateChipDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dateChipDayLabelActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  dateChipNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 4,
  },
  dateChipNumberActive: {
    color: colors.dark,
  },
  dateChipPricePill: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  dateChipPricePillActive: {
    backgroundColor: colors.primary,
  },
  dateChipPriceText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  dateChipPriceTextActive: {
    color: colors.dark,
  },

  timeOfDayTabsWrap: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  timeOfDayTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  timeOfDayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  timeOfDayTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  timeOfDayTabTextActive: {
    color: colors.dark,
    fontWeight: '800',
  },

  slotsContainer: {
    gap: 8,
  },
  slotRadioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  slotRadioCardActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  slotRadioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioCircleActive: {
    borderColor: colors.primaryDark,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },
  slotLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  slotLabelTextActive: {
    color: colors.dark,
    fontWeight: '800',
  },
  slotBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  slotBadgeAlert: {
    backgroundColor: '#FEE2E2',
  },
  slotBadgeAlertText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  slotBadgeActive: {
    backgroundColor: colors.primary,
  },
  slotBadgeActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.dark,
  },
  slotBadgeMuted: {
    backgroundColor: colors.surfaceSubtle,
  },
  slotBadgeMutedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ---------------- PACKING & ADDONS ----------------
  packingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  packingCardActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  packingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  packingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  recommendedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.dark,
  },
  packingPriceTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  packingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
    paddingLeft: 30,
  },

  addonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  addonCardActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.surface,
  },
  addonCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  addonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addonSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },

  // ---------------- FARE SUMMARY BREAKDOWN ----------------
  fareBreakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  breakdownHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  breakdownSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  breakdownTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  paymentTermsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  paymentTermsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 15,
  },

  // ---------------- BOTTOM STICKY BAR ----------------
  bottomStickyBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...shadows.floating,
  },
  primaryPillBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  primaryPillBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 0.2,
  },
  step2BottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  step2SummaryLeft: {
    flex: 1,
  },
  step2ItemsCount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  step2HomeEstimate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  step2ProceedBtn: {
    backgroundColor: colors.dark,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  step2ProceedBtnDisabled: {
    backgroundColor: colors.surfacePressed,
  },
  step2ProceedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onDark,
  },
  step2ProceedBtnTextDisabled: {
    color: colors.textMuted,
  },
  confirmPillFallbackBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  confirmPillFallbackText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark,
  },

  // ---------------- FAQ MODAL ----------------
  faqModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 19, 0.45)',
    justifyContent: 'flex-end',
  },
  faqModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
    ...shadows.floating,
  },
  faqModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  faqModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  faqCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqScrollView: {
    marginBottom: 16,
  },
  faqItemCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  faqAnswerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  faqSupportCallout: {
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  faqSupportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  faqSupportDesc: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
  faqGotItBtn: {
    backgroundColor: colors.dark,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  faqGotItBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onDark,
  },
});
