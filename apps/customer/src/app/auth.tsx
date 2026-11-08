import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
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
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme/theme';

export default function AuthScreen() {
  const { refreshStatus } = useAuth();

  // Navigation / Tabs: 'phone' (India-first OTP) or 'email' (operations / test accounts)
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');

  // Phone Auth State
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Phone Registration Lookup State
  const [phoneLookupResult, setPhoneLookupResult] = useState<{
    checked: boolean;
    registered: boolean;
    name: string | null;
  }>({ checked: false, registered: false, name: null });

  // Email Auth State
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Focus & Animation
  const [isInputFocused, setIsInputFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const otpInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Indian Phone Validation: 10 digits starting with 6, 7, 8, or 9
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanPhone);

  // Server-side check if phone is already registered
  useEffect(() => {
    if (isPhoneValid) {
      const fullPhone = `+91${cleanPhone}`;
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://atarashi-logistics-api.onrender.com';
      fetch(`${apiBase}/v1/auth/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
        .then((res) => res.json())
        .then((data) => {
          setPhoneLookupResult({
            checked: true,
            registered: Boolean(data.registered),
            name: data.name || null,
          });
        })
        .catch(() => {
          setPhoneLookupResult({ checked: false, registered: false, name: null });
        });
    } else {
      setPhoneLookupResult({ checked: false, registered: false, name: null });
    }
  }, [cleanPhone, isPhoneValid]);

  // Dynamic post-auth redirection based on server onboarding status
  const navigateAfterAuth = async () => {
    try {
      const status = await refreshStatus();
      if (status?.onboarding_completed) {
        router.replace('/');
      } else {
        router.replace('/onboarding' as any);
      }
    } catch {
      router.replace('/onboarding' as any);
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (phoneStep === 'otp' && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phoneStep, countdown]);

  // Clear messages on tab or mode change
  const switchMethod = (method: 'phone' | 'email') => {
    setAuthMethod(method);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSendOtp = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    const fullPhone = `+91${cleanPhone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        throw error;
      }

      setPhoneStep('otp');
      setCountdown(30);
      setCanResend(false);
      setSuccessMessage(`OTP sent successfully to +91 ${cleanPhone}`);

      // Auto focus OTP input
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP code';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = otpCode.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code');
      return;
    }

    setLoading(true);
    const fullPhone = `+91${cleanPhone}`;

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: cleanOtp,
        type: 'sms',
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSuccessMessage('Verification successful! Welcome to Atarashi.');
        setTimeout(() => {
          navigateAfterAuth();
        }, 500);
      } else {
        setErrorMessage('Verification completed, but session could not be established.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP code';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setOtpCode('');
    await handleSendOtp();
  };

  const handleEmailAuth = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      if (emailMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage('Signed in successfully!');
          setTimeout(() => {
            navigateAfterAuth();
          }, 500);
        }
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'customer',
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage('Account created successfully!');
          setTimeout(() => {
            navigateAfterAuth();
          }, 500);
        } else {
          setSuccessMessage('Account registered! Please check your email to confirm registration.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.canvas}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          {phoneStep === 'otp' || authMethod === 'email' ? (
            <Pressable
              onPress={() => {
                if (phoneStep === 'otp') {
                  setPhoneStep('input');
                  setOtpCode('');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                } else {
                  switchMethod('phone');
                }
              }}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ChevronLeft size={22} color="#111813" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <View style={styles.brandRow}>
            <Image
              source={require('@/assets/images/emblem.png')}
              style={styles.brandEmblem}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>ATARASHI</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Hero Welcome Card */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Welcome to Atarashi</Text>
          <Text style={styles.heroSubtitle}>
            India's high-velocity parcel & intra-city logistics network. Sign in to track, send,
            and manage shipments.
          </Text>
        </View>

        {/* Neomorphic Method Toggle: Phone & OTP vs Email */}
        <View style={styles.segmentContainer}>
          <Pressable
            onPress={() => switchMethod('phone')}
            style={[
              styles.segmentPill,
              authMethod === 'phone' && styles.segmentPillActive,
            ]}
          >
            <Smartphone
              size={16}
              color={authMethod === 'phone' ? '#111813' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentText,
                authMethod === 'phone' && styles.segmentTextActive,
              ]}
            >
              Mobile & OTP
            </Text>
          </Pressable>

          <Pressable
            onPress={() => switchMethod('email')}
            style={[
              styles.segmentPill,
              authMethod === 'email' && styles.segmentPillActive,
            ]}
          >
            <Mail
              size={16}
              color={authMethod === 'email' ? '#111813' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentText,
                authMethod === 'email' && styles.segmentTextActive,
              ]}
            >
              Operations / Email
            </Text>
          </Pressable>
        </View>

        {/* Feedback Alerts */}
        {errorMessage && (
          <View style={styles.alertError}>
            <AlertCircle size={18} color="#DC2626" />
            <Text style={styles.alertErrorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.alertSuccess}>
            <CheckCircle2 size={18} color="#16A34A" />
            <Text style={styles.alertSuccessText}>{successMessage}</Text>
          </View>
        )}

        {/* Card Surface */}
        <View style={styles.formCard}>
          {authMethod === 'phone' ? (
            phoneStep === 'input' ? (
              /* Phone Input Step */
              <View>
                <View style={styles.stepHeader}>
                  <Text style={styles.cardHeading}>Enter your phone number</Text>
                  <Text style={styles.cardSubheading}>
                    We will send a 6-digit one-time verification password (OTP).
                  </Text>
                </View>

                {/* Mobile Input with Fixed +91 */}
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.flagPrefix}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.prefixCode}>+91</Text>
                    <View style={styles.prefixDivider} />
                  </View>

                  <TextInput
                    style={styles.phoneTextInput}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text.replace(/\D/g, ''));
                      setErrorMessage(null);
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    autoFocus
                  />

                  {isPhoneValid && (
                    <View style={styles.validCheck}>
                      <CheckCircle2 size={18} color="#16A34A" />
                    </View>
                  )}
                </View>

                {/* Server Registration Status Indicator */}
                {phoneLookupResult.checked && (
                  <View style={styles.phoneStatusBadge}>
                    {phoneLookupResult.registered ? (
                      <>
                        <View style={styles.greenStatusDot} />
                        <Text style={styles.phoneStatusBadgeText}>
                          Welcome back{phoneLookupResult.name ? `, ${phoneLookupResult.name}` : ''}! • Registered Member
                        </Text>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} color="#0F172A" />
                        <Text style={styles.phoneStatusBadgeText}>
                          New to Atarashi • Fast Onboarding & ₹500 Delivery Credit
                        </Text>
                      </>
                    )}
                  </View>
                )}

                <Text style={styles.inputHelperText}>
                  Standard SMS rates or WhatsApp verification apply.
                </Text>

                {/* Submit Button */}
                <Pressable
                  onPress={handleSendOtp}
                  disabled={!isPhoneValid || loading}
                  style={[
                    styles.primaryPillButton,
                    (!isPhoneValid || loading) && styles.primaryPillButtonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#111813" />
                  ) : (
                    <>
                      <Text style={styles.primaryPillButtonText}>Get OTP</Text>
                      <ArrowRight size={18} color="#111813" />
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              /* OTP Verification Step */
              <View>
                <View style={styles.stepHeader}>
                  <View style={styles.otpHeaderRow}>
                    <Text style={styles.cardHeading}>Verify Phone</Text>
                    <Pressable
                      onPress={() => {
                        setPhoneStep('input');
                        setOtpCode('');
                        setErrorMessage(null);
                      }}
                      style={styles.changePhoneButton}
                    >
                      <Text style={styles.changePhoneText}>Change</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.cardSubheading}>
                    Enter the 6-digit code sent to{' '}
                    <Text style={styles.boldHighlight}>+91 {cleanPhone}</Text>
                  </Text>
                </View>

                {/* 6-Digit OTP Box Grid */}
                <View style={styles.otpContainer}>
                  {/* Invisible native input for responsive typing */}
                  <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenOtpInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={(val) => {
                      const clean = val.replace(/\D/g, '');
                      setOtpCode(clean);
                      setErrorMessage(null);
                      if (clean.length === 6) {
                        Keyboard.dismiss();
                      }
                    }}
                    autoFocus
                  />

                  {/* 6 Visual Neomorphic Boxes */}
                  <Pressable
                    style={styles.otpBoxesRow}
                    onPress={() => otpInputRef.current?.focus()}
                  >
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const digit = otpCode[idx] || '';
                      const isFocused = otpCode.length === idx;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.otpBox,
                            isFocused && styles.otpBoxFocused,
                            digit && styles.otpBoxFilled,
                          ]}
                        >
                          <Text style={styles.otpDigitText}>{digit}</Text>
                        </View>
                      );
                    })}
                  </Pressable>
                </View>

                {/* Countdown Resend Row */}
                <View style={styles.resendRow}>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>
                      Resend OTP in <Text style={styles.countdownBold}>{countdown}s</Text>
                    </Text>
                  ) : (
                    <Pressable
                      onPress={handleResendOtp}
                      style={styles.resendActiveButton}
                      disabled={loading}
                    >
                      <RotateCcw size={14} color="#111813" />
                      <Text style={styles.resendActiveText}>Resend OTP Now</Text>
                    </Pressable>
                  )}
                </View>

                {/* Verify Button */}
                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={otpCode.length !== 6 || loading}
                  style={[
                    styles.primaryPillButton,
                    (otpCode.length !== 6 || loading) && styles.primaryPillButtonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#111813" />
                  ) : (
                    <>
                      <Text style={styles.primaryPillButtonText}>Verify & Continue</Text>
                      <ShieldCheck size={18} color="#111813" />
                    </>
                  )}
                </Pressable>
              </View>
            )
          ) : (
            /* Email & Password Mode */
            <View>
              {/* Sign In vs Sign Up Sub-toggle */}
              <View style={styles.subModeRow}>
                <Pressable
                  onPress={() => {
                    setEmailMode('signin');
                    setErrorMessage(null);
                  }}
                  style={[
                    styles.subModePill,
                    emailMode === 'signin' && styles.subModePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subModeText,
                      emailMode === 'signin' && styles.subModeTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setEmailMode('signup');
                    setErrorMessage(null);
                  }}
                  style={[
                    styles.subModePill,
                    emailMode === 'signup' && styles.subModePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subModeText,
                      emailMode === 'signup' && styles.subModeTextActive,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>

              {/* Full Name for Sign Up */}
              {emailMode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.textInputWrapper}>
                    <User size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInputField}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.textInputWrapper}>
                  <Mail size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="operations@atarashi.in"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.textInputWrapper}>
                  <Lock size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Action Button */}
              <Pressable
                onPress={handleEmailAuth}
                disabled={loading}
                style={[styles.primaryPillButton, loading && styles.primaryPillButtonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#111813" />
                ) : (
                  <>
                    <Text style={styles.primaryPillButtonText}>
                      {emailMode === 'signin' ? 'Sign In to Portal' : 'Register Account'}
                    </Text>
                    <ArrowRight size={18} color="#111813" />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Security & Invariants Footnote */}
        <View style={styles.securityFootnote}>
          <ShieldCheck size={16} color="#64748B" />
          <Text style={styles.securityFootnoteText}>
            Protected by Hardware-Backed Android Keystore & 256-Bit Encrypted Storage.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#F4F7F4', // Strict Neomorphic Chalk Canvas
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandEmblem: {
    width: 26,
    height: 26,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#111813',
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111813',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E9E5',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 20,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 6,
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#111813',
    fontWeight: '700',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  alertSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepHeader: {
    marginBottom: 18,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111813',
    marginBottom: 4,
  },
  cardSubheading: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  boldHighlight: {
    fontWeight: '700',
    color: '#111813',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changePhoneButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
  },
  changePhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 8,
  },
  flagPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  prefixCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111813',
  },
  prefixDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111813',
    letterSpacing: 1,
  },
  validCheck: {
    marginLeft: 6,
  },
  phoneStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneStatusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 6,
  },
  greenStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  inputHelperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  primaryPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6EE787', // Vibrant mint green accent
    borderRadius: 9999,
    height: 54,
    shadowColor: '#5EDB79',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    gap: 8,
  },
  primaryPillButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryPillButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111813',
  },
  otpContainer: {
    marginVertical: 18,
    position: 'relative',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: '#5EDB79',
    backgroundColor: '#FFFFFF',
    shadowColor: '#5EDB79',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111813',
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 22,
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
  },
  countdownBold: {
    fontWeight: '700',
    color: '#111813',
  },
  resendActiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
  },
  resendActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111813',
  },
  subModeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
    padding: 3,
    marginBottom: 18,
  },
  subModePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9999,
  },
  subModePillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  subModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subModeTextActive: {
    color: '#111813',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111813',
    marginBottom: 6,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInputField: {
    flex: 1,
    fontSize: 15,
    color: '#111813',
    fontWeight: '600',
  },
  securityFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
    paddingHorizontal: 16,
  },
  securityFootnoteText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
});
