import { createClient } from '@supabase/supabase-js';

// Service role key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const VALID_GRADES = ['A+', 'A', 'B+', 'Needs Work'] as const;

// Base URL resolver with request-origin priority
function resolveBaseUrl(event: any): string {
  // Prefer the live request origin first
  const fromRaw = (() => {
    try {
      if (event?.rawUrl) return new URL(event.rawUrl).origin;
      const proto =
        event?.headers?.["x-forwarded-proto"] ||
        event?.headers?.["x-forwarded-protocol"] ||
        "https";
      const host =
        event?.headers?.["x-forwarded-host"] ||
        event?.headers?.host;
      if (host) return `${proto}://${host}`;
      return null;
    } catch { return null; }
  })();

  const raw =
    fromRaw ||
    process.env.DEPLOY_URL ||        // branch/preview exact URL
    process.env.DEPLOY_PRIME_URL ||  // preview URL
    process.env.URL ||               // may be primary custom domain
    process.env.SITE_URL;            // usually primary custom domain

  if (!raw) throw new Error("MISSING_BASE_URL");
  return String(raw).replace(/\/+$/, "");
}

// Input validation function
function validateInput(payload: any) {
  const errors: string[] = [];

  // Validate assessmentInputs
  if (!payload.assessmentInputs || typeof payload.assessmentInputs !== 'object') {
    errors.push('assessmentInputs is required and must be an object');
  } else {
    const { assessmentInputs } = payload;
    
    // full_name_entered
    if (!assessmentInputs.full_name_entered || typeof assessmentInputs.full_name_entered !== 'string') {
      errors.push('assessmentInputs.full_name_entered is required');
    } else if (assessmentInputs.full_name_entered.trim().length < 1 || assessmentInputs.full_name_entered.trim().length > 120) {
      errors.push('full_name_entered must be 1-120 characters');
    }

    // email_entered
    if (!assessmentInputs.email_entered || typeof assessmentInputs.email_entered !== 'string') {
      errors.push('assessmentInputs.email_entered is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(assessmentInputs.email_entered.toLowerCase().trim())) {
        errors.push('email_entered must be a valid RFC5322 email');
      }
    }

    // state
    if (!assessmentInputs.state || !US_STATES.includes(assessmentInputs.state)) {
      errors.push('state must be a valid US state');
    }

    // city
    if (!assessmentInputs.city || typeof assessmentInputs.city !== 'string') {
      errors.push('assessmentInputs.city is required');
    } else if (assessmentInputs.city.trim().length < 1 || assessmentInputs.city.trim().length > 120) {
      errors.push('city must be 1-120 characters');
    }
  }

  // Validate answers
  if (!payload.answers || typeof payload.answers !== 'object') {
    errors.push('answers is required and must be an object');
  }

  // Validate scores
  if (!payload.scores || typeof payload.scores !== 'object') {
    errors.push('scores is required and must be an object');
  } else {
    const { scores } = payload;
    const requiredScores = ['operational', 'licensing', 'feedback', 'certifications', 'digital', 'total'];
    
    requiredScores.forEach(score => {
      if (typeof scores[score] !== 'number' || !Number.isInteger(scores[score])) {
        errors.push(`scores.${score} must be an integer`);
      }
    });

    if (!VALID_GRADES.includes(scores.grade)) {
      errors.push('scores.grade must be one of: A+, A, B+, Needs Work');
    }

    if (typeof scores.isEligibleForCertification !== 'boolean') {
      errors.push('scores.isEligibleForCertification must be a boolean');
    }

    if (!Array.isArray(scores.eligibilityReasons)) {
      errors.push('scores.eligibilityReasons must be an array');
    }

    if (!Array.isArray(scores.opportunities)) {
      errors.push('scores.opportunities must be an array');
    }
  }

  // Validate planSlug (optional with default)
  if (payload.planSlug && typeof payload.planSlug !== 'string') {
    errors.push('planSlug must be a string if provided');
  }

  return errors;
}

// JSON response helper
function json(statusCode: number, data: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

export const handler = async (event: any) => {
  try {
    // Debug probe
    if (event.httpMethod === 'GET' && event.queryStringParameters?.debug === '1') {
      const baseUrl = resolveBaseUrl(event);
      return json(200, { baseUrl });
    }

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    // Parse and validate input
    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (e) {
      return json(400, { error: 'INVALID_JSON' });
    }

    const validationErrors = validateInput(payload);
    if (validationErrors.length > 0) {
      return json(400, { error: 'VALIDATION_ERROR', details: validationErrors });
    }

    const { assessmentInputs, answers, scores, planSlug = 'founding-member', startCheckout } = payload;

    // Normalize data
    const normalizedEmail = assessmentInputs.email_entered.toLowerCase().trim();
    const normalizedName = assessmentInputs.full_name_entered.trim();
    const normalizedCity = assessmentInputs.city.trim();

    // Extract services array from answers.services boolean object
    const servicesArray = Object.entries(answers.services || {})
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);

    // 1. Upsert profile by email
    const profileData = {
      email: normalizedEmail,
      full_name: normalizedName,
      company_name: answers.businessName?.trim() || null,
      state: assessmentInputs.state,
      city: normalizedCity,
      years_in_business: answers.yearsInBusiness || null,
      services: servicesArray.length > 0 ? servicesArray : null
    };

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    let profileId;
    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('email', normalizedEmail)
        .select('id')
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
        return json(500, { error: 'PROFILE_UPDATE_FAILED', details: updateError.message });
      }
      profileId = updatedProfile.id;
    } else {
      // Insert new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select('id')
        .single();

      if (insertError) {
        console.error('Profile insert error:', insertError);
        return json(500, { error: 'PROFILE_INSERT_FAILED', details: insertError.message });
      }
      profileId = newProfile.id;
    }

    // 2. Insert assessment
    const assessmentData = {
      profile_id: profileId,
      email_entered: normalizedEmail,
      full_name_entered: normalizedName,
      state: assessmentInputs.state,
      city: normalizedCity,
      answers: answers, // Full JSONB snapshot
      operational_score: scores.operational,
      licensing_score: scores.licensing,
      feedback_score: scores.feedback,
      certifications_score: scores.certifications,
      digital_score: scores.digital,
      total_score: scores.total,
      pci_rating: scores.grade,
      scenario: scores.isEligibleForCertification ? 'eligible' : 'not_eligible',
      eligibility_reasons: scores.eligibilityReasons,
      opportunities: scores.opportunities
    };

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert(assessmentData)
      .select('id')
      .single();

    if (assessmentError) {
      console.error('Assessment insert error:', assessmentError);
      return json(500, { error: 'ASSESSMENT_INSERT_FAILED', details: assessmentError.message });
    }

    console.log('[save-assessment] Successfully saved:', { profileId, assessmentId: assessment.id });

    // 3. Optional Stripe checkout creation
    if (startCheckout) {
      try {
        const baseUrl = resolveBaseUrl(event);
        
        // Call create-checkout-session function
        const checkoutPayload = {
          intendedTier: planSlug,
          email: normalizedEmail,
          assessmentId: assessment.id,
          profileId: profileId
        };

        // Import Stripe logic from create-checkout-session
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Get price ID based on planSlug
        const priceIdMap = {
          'founding-member': process.env.STRIPE_PRICE_FOUNDING_MEMBER,
          'bronze': process.env.STRIPE_PRICE_BRONZE,
          'silver': process.env.STRIPE_PRICE_SILVER,
          'gold': process.env.STRIPE_PRICE_GOLD
        };

        const priceId = priceIdMap[planSlug as keyof typeof priceIdMap];
        if (!priceId) {
          return json(400, { error: 'INVALID_PLAN_SLUG' });
        }

        const success_url = `${baseUrl}/success/${planSlug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancel_url = `${baseUrl}/results?checkout=cancelled`;

        console.log('[save-assessment] Creating Stripe session:', { baseUrl, success_url, cancel_url });

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price: priceId,
            quantity: 1,
          }],
          mode: 'subscription',
          success_url,
          cancel_url,
          customer_email: normalizedEmail,
          metadata: {
            profile_id: profileId,
            assessment_id: assessment.id,
            email_entered: normalizedEmail,
            plan: planSlug
          }
        });

        return json(200, {
          url: session.url,
          profile_id: profileId,
          assessment_id: assessment.id
        });

      } catch (stripeError) {
        console.error('Stripe checkout creation failed:', stripeError);
        return json(500, { error: 'STRIPE_CHECKOUT_FAILED', details: stripeError.message });
      }
    }

    // Return success without checkout
    return json(200, {
      profile_id: profileId,
      assessment_id: assessment.id
    });

  } catch (error) {
    console.error('Save assessment error:', error);
    return json(500, { error: 'INTERNAL_SERVER_ERROR' });
  }
};