import type { FastifyPluginAsync } from 'fastify';
import { userOnboardingSchema } from '@atarashi/domain';

export const userRoutes: FastifyPluginAsync = async (app) => {
  // 1. Check if phone is registered (public endpoint)
  app.post('/v1/auth/check-phone', async (request, reply) => {
    const { phone } = (request.body as { phone?: string }) || {};
    if (!phone) {
      return reply.status(400).send({ error: 'phone is required' });
    }
    const cleanPhone = phone.trim();

    // Check Supabase if configured
    if (app.supabase) {
      try {
        const { data, error } = await app.supabase
          .from('profiles')
          .select('id, full_name, onboarding_completed')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (error) {
          app.log.warn({ error }, 'Failed to check phone in supabase');
        } else if (data) {
          return reply.send({
            registered: true,
            onboarding_completed: Boolean(data.onboarding_completed),
            name: data.full_name || null,
          });
        }
      } catch (err) {
        app.log.warn({ err }, 'Error checking phone in supabase');
      }
    }

    // Check memory store
    const memProfile = app.store.findProfileByPhone(cleanPhone);
    if (memProfile) {
      return reply.send({
        registered: true,
        onboarding_completed: memProfile.onboarding_completed,
        name: memProfile.full_name,
      });
    }

    return reply.send({ registered: false, onboarding_completed: false, name: null });
  });

  // 2. Server-side check: is user new or registered, onboarding status & dynamic steps
  app.get('/v1/user/onboarding-status', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Bearer token required' });
    }

    let profile: any = null;
    let priorBookingsCount = 0;

    // Check live Supabase
    if (app.supabase) {
      try {
        const { data, error } = await app.supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          profile = data;
        }

        const { count } = await app.supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', user.id);
        priorBookingsCount = count || 0;
      } catch (err) {
        app.log.warn({ err }, 'Supabase onboarding-status query error');
      }
    }

    // Fallback to memory store if no DB profile
    if (!profile) {
      profile = app.store.getProfile(user.id);
      if (!profile) {
        profile = app.store.upsertProfile(user.id, {
          email: user.email || null,
          phone: user.phone || null,
        });
      }
    }

    // Determine if new user or existing registered user
    // A user is new if they haven't completed onboarding, have no prior bookings, and no completed profile name
    const onboardingCompleted = Boolean(profile.onboarding_completed);
    const hasExistingIdentity = Boolean(profile.full_name && (profile.phone || profile.email));
    const isNewUser = !hasExistingIdentity && priorBookingsCount === 0;

    // Server dynamically calculates steps based on registration status
    let stepCount = 0;
    let stepsRequired: string[] = [];

    if (!onboardingCompleted) {
      if (isNewUser) {
        // Multi-step full onboarding for brand new users:
        // Step 1: Personal Profile (Full Name, Contact, Account Type)
        // Step 2: Hub & Address (City, Street, Pincode)
        // Step 3 (Conditional): Business Details if account_type === 'business'
        // Step 4: Welcome & ₹500 Delivery Credit Activation
        stepsRequired = ['profile', 'location'];
        if (profile.account_type === 'business') {
          stepsRequired.push('business');
        }
        stepsRequired.push('welcome');
        stepCount = stepsRequired.length;
      } else {
        // Existing registered user with missing hub/address: express 1-step flow
        stepsRequired = ['location'];
        stepCount = 1;
      }
    }

    return reply.send({
      user_id: user.id,
      is_new_user: isNewUser,
      onboarding_completed: onboardingCompleted,
      step_count: stepCount,
      steps_required: stepsRequired,
      next_step: stepsRequired[0] || 'complete',
      profile: {
        id: user.id,
        full_name: profile.full_name || null,
        email: profile.email || user.email || null,
        phone: profile.phone || user.phone || null,
        account_type: profile.account_type || 'personal',
        company_name: profile.company_name || null,
        gstin: profile.gstin || null,
        city: profile.city || null,
        default_address: profile.default_address || null,
        default_pincode: profile.default_pincode || null,
        preferred_vehicle: profile.preferred_vehicle || 'bike',
      },
    });
  });

  // 3. Save onboarding details & mark onboarding complete
  app.post('/v1/user/onboarding-complete', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Bearer token required' });
    }

    const parseResult = userOnboardingSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        issues: parseResult.error.format(),
      });
    }

    const body = parseResult.data;

    // Server-authoritative update in live Supabase
    if (app.supabase) {
      try {
        const updatePayload: Record<string, any> = {
          full_name: body.full_name,
          onboarding_completed: true,
          account_type: body.account_type,
          city: body.city,
          default_address: body.default_address,
          preferred_vehicle: body.preferred_vehicle || 'bike',
          updated_at: new Date().toISOString(),
        };
        if (body.email) updatePayload.email = body.email;
        if (body.phone) updatePayload.phone = body.phone;
        if (body.company_name) updatePayload.company_name = body.company_name;
        if (body.gstin) updatePayload.gstin = body.gstin;
        if (body.default_pincode) updatePayload.default_pincode = body.default_pincode;

        const { error } = await app.supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);

        if (error) {
          app.log.error({ error }, 'Failed to update profile in supabase');
        }

        // Check if welcome bonus credit already given in wallet_ledger
        const welcomeKey = `welcome_credit_${user.id}`;
        const { data: existingCredit } = await app.supabase
          .from('wallet_ledger')
          .select('id')
          .eq('idempotency_key', welcomeKey)
          .maybeSingle();

        if (!existingCredit) {
          // Credit 50,000 paise (₹500) welcome bonus
          await app.supabase.from('wallet_ledger').insert({
            user_id: user.id,
            amount_paise: 50000,
            entry_type: 'credit',
            idempotency_key: welcomeKey,
          });
        }
      } catch (err) {
        app.log.error({ err }, 'Error completing onboarding in supabase');
      }
    }

    // Also update MemoryStore
    const updatedProfile = app.store.upsertProfile(user.id, {
      full_name: body.full_name,
      email: body.email || null,
      phone: body.phone || null,
      account_type: body.account_type,
      company_name: body.company_name || null,
      gstin: body.gstin || null,
      city: body.city,
      default_address: body.default_address,
      default_pincode: body.default_pincode || null,
      preferred_vehicle: body.preferred_vehicle || 'bike',
      onboarding_completed: true,
    });

    // Credit welcome in memory store
    app.store.topupWallet(user.id, 50000, `welcome_credit_${user.id}`);

    return reply.send({
      status: 'success',
      onboarding_completed: true,
      profile: updatedProfile,
      welcome_bonus_paise: 50000,
    });
  });
};
