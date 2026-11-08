import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Gift,
  HelpCircle,
  Mail,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme/theme';

const INDIAN_HUBS = [
  { id: 'Bengaluru', label: 'Bengaluru', hubCode: 'BLR' },
  { id: 'Mumbai', label: 'Mumbai', hubCode: 'BOM' },
  { id: 'Delhi-NCR', label: 'Delhi-NCR', hubCode: 'DEL' },
  { id: 'Hyderabad', label: 'Hyderabad', hubCode: 'HYD' },
  { id: 'Chennai', label: 'Chennai', hubCode: 'MAA' },
  { id: 'Pune', label: 'Pune', hubCode: 'PNQ' },
];

const VEHICLE_OPTIONS = [
  { id: 'bike', label: '2 Wheeler', desc: 'Up to 20kg • Express' },
  { id: 'auto', label: '3 Wheeler', desc: 'Up to 150kg • Weatherproof' },
  { id: 'car', label: '4 Wheeler', desc: 'Up to 300kg • Fragile cargo' },
  { id: 'pickup', label: 'Pickup Truck', desc: 'Up to 1000kg • Bulk goods' },
];

export default function OnboardingScreen() {
  const { session, onboardingStatus, refreshStatus, signOut } = useAuth();

  // Initializing state from server status
  const isNewUser = onboardingStatus ? onboardingStatus.is_new_user : true;
  const initialProfile = onboardingStatus?.profile;

  // Form Fields
  const [fullName, setFullName] = useState(initialProfile?.full_name || '');
  const [email, setEmail] = useState(initialProfile?.email || session?.user.email || '');
  const [phone, setPhone] = useState(initialProfile?.phone || session?.user.phone || '');
  const [accountType, setAccountType] = useState<'personal' | 'business'>(
    initialProfile?.account_type || 'personal'
  );
  const [companyName, setCompanyName] = useState(initialProfile?.company_name || '');
  const [gstin, setGstin] = useState(initialProfile?.gstin || '');
  const [city, setCity] = useState(initialProfile?.city || 'Bengaluru');
  const [defaultAddress, setDefaultAddress] = useState(initialProfile?.default_address || '');
  const [defaultPincode, setDefaultPincode] = useState(initialProfile?.default_pincode || '');
  const [preferredVehicle, setPreferredVehicle] = useState<'bike' | 'auto' | 'car' | 'pickup'>(
    initialProfile?.preferred_vehicle || 'bike'
  );

  // Dynamic Step Management based on Server-Side Determination
  // If existing user: 1 step (Location hub confirmation)
  // If new user: multi-step flow
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completedCelebration, setCompletedCelebration] = useState(false);

  // Compute dynamic steps
  const steps: ('profile' | 'location' | 'business' | 'celebration')[] = [];
  if (isNewUser) {
    steps.push('profile');
    steps.push('location');
    if (accountType === 'business') {
      steps.push('business');
    }
    steps.push('celebration');
  } else {
    // Existing user who only needs location/address confirmation
    steps.push('location');
    steps.push('celebration');
  }

  const currentStep = steps[activeStepIndex] || steps[0];
  const totalSteps = steps.length;

  useEffect(() => {
    if (initialProfile) {
      if (initialProfile.full_name && !fullName) setFullName(initialProfile.full_name);
      if (initialProfile.email && !email) setEmail(initialProfile.email);
      if (initialProfile.phone && !phone) setPhone(initialProfile.phone);
      if (initialProfile.city && !city) setCity(initialProfile.city);
      if (initialProfile.default_address && !defaultAddress) setDefaultAddress(initialProfile.default_address);
      if (initialProfile.default_pincode && !defaultPincode) setDefaultPincode(initialProfile.default_pincode);
    }
  }, [initialProfile]);

  const handleNextStep = async () => {
    Keyboard.dismiss();

    if (currentStep === 'profile') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        Alert.alert('Name Required', 'Please enter your full name (minimum 2 characters).');
        return;
      }
      if (email.trim() && !email.includes('@')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address for digital invoices.');
        return;
      }
      setActiveStepIndex((prev) => prev + 1);
      return;
    }

    if (currentStep === 'location') {
      if (!defaultAddress.trim() || defaultAddress.trim().length < 3) {
        Alert.alert('Address Required', 'Please enter your default pickup address or area.');
        return;
      }
      if (defaultPincode.trim() && !/^\d{6}$/.test(defaultPincode.trim())) {
        Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit Indian postal pincode.');
        return;
      }

      // If next step is business, advance. If next step is celebration, submit to server!
      const nextStepKey = steps[activeStepIndex + 1];
      if (nextStepKey === 'business') {
        setActiveStepIndex((prev) => prev + 1);
        return;
      }

      await submitOnboardingToServer();
      return;
    }

    if (currentStep === 'business') {
      if (!companyName.trim() || companyName.trim().length < 2) {
        Alert.alert('Company Name Required', 'Please enter your business or legal entity name.');
        return;
      }
      await submitOnboardingToServer();
      return;
    }

    if (currentStep === 'celebration' || completedCelebration) {
      router.replace('/');
    }
  };

  const submitOnboardingToServer = async () => {
    if (!session) return;
    setSubmitting(true);

    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://atarashi-logistics-api.onrender.com';
    const payload = {
      full_name: fullName.trim() || initialProfile?.full_name || 'Atarashi Customer',
      email: email.trim() || initialProfile?.email || undefined,
      phone: phone.trim() || initialProfile?.phone || undefined,
      account_type: accountType,
      company_name: companyName.trim() || undefined,
      gstin: gstin.trim() || undefined,
      city: city.trim(),
      default_address: defaultAddress.trim(),
      default_pincode: defaultPincode.trim() || undefined,
      preferred_vehicle: preferredVehicle,
    };

    try {
      let saved = false;

      // 1. Try server Fastify endpoint
      try {
        const res = await fetch(`${apiBase}/v1/user/onboarding-complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          saved = true;
        }
      } catch {
        // Fallback to direct Supabase update
      }

      // 2. Direct Supabase Fallback if server route not yet deployed on Render
      if (!saved) {
        const updatePayload: Record<string, any> = {
          full_name: payload.full_name,
          account_type: payload.account_type,
          city: payload.city,
          default_address: payload.default_address,
          preferred_vehicle: payload.preferred_vehicle,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        };
        if (payload.email) updatePayload.email = payload.email;
        if (payload.phone) updatePayload.phone = payload.phone;
        if (payload.company_name) updatePayload.company_name = payload.company_name;
        if (payload.gstin) updatePayload.gstin = payload.gstin;
        if (payload.default_pincode) updatePayload.default_pincode = payload.default_pincode;

        const { error: sbError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', session.user.id);

        if (sbError) {
          throw sbError;
        }

        // Initialize welcome bonus credit in wallet_ledger
        const welcomeKey = `welcome_credit_${session.user.id}`;
        try {
          await supabase.from('wallet_ledger').insert({
            user_id: session.user.id,
            amount_paise: 50000,
            entry_type: 'credit',
            idempotency_key: welcomeKey,
          });
        } catch {
          // Ignore if already credited
        }
      }

      await refreshStatus();
      setCompletedCelebration(true);
      // Advance to celebration step
      setActiveStepIndex(steps.length - 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete onboarding.';
      Alert.alert('Onboarding Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandEmblem}>
            <Package size={20} color="#0F172A" />
          </View>
          <View>
            <Text style={styles.brandTitle}>ATARASHI LOGISTICS</Text>
            <Text style={styles.brandSubtitle}>
              {isNewUser ? 'New Customer Onboarding' : 'Account Hub Setup'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to exit setup and sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]);
          }}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Progress Indicators */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            {isNewUser
              ? `Step ${activeStepIndex + 1} of ${totalSteps}`
              : 'Express Setup • 1 Step'}
          </Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {isNewUser ? 'Verified Registration' : 'Returning Member'}
            </Text>
          </View>
        </View>

        <View style={styles.progressBarTrack}>
          {steps.map((stepKey, idx) => {
            const isCompleted = idx < activeStepIndex || completedCelebration;
            const isCurrent = idx === activeStepIndex;
            return (
              <View
                key={stepKey}
                style={[
                  styles.progressBarSegment,
                  isCompleted && styles.progressBarSegmentCompleted,
                  isCurrent && styles.progressBarSegmentCurrent,
                ]}
              />
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Personal Profile */}
        {currentStep === 'profile' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <User size={22} color="#0F172A" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Complete Your Profile</Text>
                <Text style={styles.cardSubtitle}>
                  Set up your sender identity for instant dispatch & delivery receipts.
                </Text>
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name (Required)</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Sagar Sharma"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address (For Tax Invoices & Receipts)</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Account Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Category</Text>
              <View style={styles.accountTypeRow}>
                <Pressable
                  accessibilityRole="button"
                  style={[
                    styles.accountTypeCard,
                    accountType === 'personal' && styles.accountTypeCardActive,
                  ]}
                  onPress={() => setAccountType('personal')}
                >
                  <View style={styles.accountTypeCardTop}>
                    <Package
                      size={20}
                      color={accountType === 'personal' ? '#0F172A' : '#64748B'}
                    />
                    {accountType === 'personal' && (
                      <View style={styles.activeCheckCircle}>
                        <Check size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.accountTypeName}>Personal</Text>
                  <Text style={styles.accountTypeDesc}>Parcels, couriers, gifts & everyday items</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={[
                    styles.accountTypeCard,
                    accountType === 'business' && styles.accountTypeCardActive,
                  ]}
                  onPress={() => setAccountType('business')}
                >
                  <View style={styles.accountTypeCardTop}>
                    <Briefcase
                      size={20}
                      color={accountType === 'business' ? '#0F172A' : '#64748B'}
                    />
                    {accountType === 'business' && (
                      <View style={styles.activeCheckCircle}>
                        <Check size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.accountTypeName}>Business</Text>
                  <Text style={styles.accountTypeDesc}>Bulk shipments, merchant retail & GST bills</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Location & Primary Hub */}
        {currentStep === 'location' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <MapPin size={22} color="#0F172A" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Primary Delivery Hub</Text>
                <Text style={styles.cardSubtitle}>
                  Choose your active operating city and save a default pickup address.
                </Text>
              </View>
            </View>

            {/* City Hub Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Operating City Hub</Text>
              <View style={styles.hubChipGrid}>
                {INDIAN_HUBS.map((hub) => {
                  const selected = city === hub.id;
                  return (
                    <Pressable
                      key={hub.id}
                      style={[styles.hubChip, selected && styles.hubChipSelected]}
                      onPress={() => setCity(hub.id)}
                    >
                      <MapPin
                        size={14}
                        color={selected ? '#FFFFFF' : '#475569'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.hubChipText, selected && styles.hubChipTextSelected]}>
                        {hub.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Default Pickup Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Default Pickup Address (Home / Office)</Text>
              <View style={styles.inputWrapper}>
                <Building2 size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 100ft Road, Indiranagar, Bengaluru"
                  placeholderTextColor="#94A3B8"
                  value={defaultAddress}
                  onChangeText={setDefaultAddress}
                />
              </View>
            </View>

            {/* Pincode */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Postal Pincode (6 Digits)</Text>
              <View style={styles.inputWrapper}>
                <Compass size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="560038"
                  placeholderTextColor="#94A3B8"
                  value={defaultPincode}
                  onChangeText={setDefaultPincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* Default Vehicle Preference */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Vehicle Type</Text>
              <View style={styles.vehicleGrid}>
                {VEHICLE_OPTIONS.map((v) => {
                  const selected = preferredVehicle === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      style={[styles.vehicleOption, selected && styles.vehicleOptionSelected]}
                      onPress={() => setPreferredVehicle(v.id as any)}
                    >
                      <Text style={[styles.vehicleLabel, selected && styles.vehicleLabelSelected]}>
                        {v.label}
                      </Text>
                      <Text style={styles.vehicleDesc}>{v.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Business Details (Conditional) */}
        {currentStep === 'business' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Building2 size={22} color="#0F172A" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Business & GST Details</Text>
                <Text style={styles.cardSubtitle}>
                  Add your company credentials for tax input credits and monthly reports.
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Registered Company / Firm Name</Text>
              <View style={styles.inputWrapper}>
                <Building2 size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Atarashi Logistics Pvt Ltd"
                  placeholderTextColor="#94A3B8"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GSTIN (Optional for Invoicing)</Text>
              <View style={styles.inputWrapper}>
                <ShieldCheck size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="29ABCDE1234F1Z5"
                  placeholderTextColor="#94A3B8"
                  value={gstin}
                  onChangeText={setGstin}
                  autoCapitalize="characters"
                  maxLength={15}
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Celebration / Ready to Ship */}
        {currentStep === 'celebration' && (
          <View style={[styles.card, styles.celebrationCard]}>
            <View style={styles.giftIconCircle}>
              <Gift size={40} color="#0F172A" />
            </View>
            <Text style={styles.celebrationTitle}>
              You're Ready to Ship, {fullName || 'Customer'}!
            </Text>
            <Text style={styles.celebrationSubtitle}>
              Your Atarashi account is active in {city}.
            </Text>

            <View style={styles.bonusBanner}>
              <Sparkles size={24} color="#0F172A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.bonusTitle}>₹500 Welcome Bonus Credited</Text>
                <Text style={styles.bonusDesc}>
                  50,000 paise bonus ready in your wallet for immediate parcel booking.
                </Text>
              </View>
            </View>

            <View style={styles.featurePillList}>
              <View style={styles.featurePill}>
                <CheckCircle2 size={16} color="#0F172A" />
                <Text style={styles.featurePillText}>Instant Driver Pairing</Text>
              </View>
              <View style={styles.featurePill}>
                <CheckCircle2 size={16} color="#0F172A" />
                <Text style={styles.featurePillText}>Live Route Telemetry</Text>
              </View>
              <View style={styles.featurePill}>
                <CheckCircle2 size={16} color="#0F172A" />
                <Text style={styles.featurePillText}>Zero Surge Pricing</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            currentStep === 'celebration'
              ? 'Start Delivering'
              : activeStepIndex === totalSteps - 2
              ? 'Save & Continue'
              : 'Next Step'
          }
          style={[styles.actionButton, submitting && { opacity: 0.7 }]}
          onPress={handleNextStep}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.actionButtonText}>
                {currentStep === 'celebration'
                  ? 'Start Delivering'
                  : activeStepIndex === totalSteps - 2
                  ? 'Complete Setup'
                  : 'Continue'}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </View>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandEmblem: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  progressBarTrack: {
    flexDirection: 'row',
    gap: 6,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarSegment: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  progressBarSegmentCurrent: {
    backgroundColor: '#0F172A',
  },
  progressBarSegmentCompleted: {
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.card,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  accountTypeCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
    ...theme.shadows.card,
  },
  accountTypeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activeCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTypeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  accountTypeDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
  },
  hubChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hubChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  hubChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  hubChipTextSelected: {
    color: '#FFFFFF',
  },
  vehicleGrid: {
    gap: 8,
  },
  vehicleOption: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleOptionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
  },
  vehicleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleLabelSelected: {
    color: '#0F172A',
  },
  vehicleDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  celebrationCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  giftIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  celebrationSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  bonusBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bonusDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  featurePillList: {
    width: '100%',
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 8,
  },
  actionButton: {
    height: 52,
    backgroundColor: '#0F172A',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
