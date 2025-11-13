import { getEnv } from './lib/env.js';
import { getServerClient } from '../lib/supabaseServer.js';

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
    // Check required environment variables with graceful handling
    const envCheck = getEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    
    if (!envCheck.ok) {
      console.error('[save-assessment] step:env_missing', { 
        missing: envCheck.missing,
        context: process.env.CONTEXT,
        deployUrl: process.env.DEPLOY_PRIME_URL
      });
      return json(500, { error: "database_not_available", missing: envCheck.missing });
    }

    // Get Supabase client with error handling
    let serverClient;
    try {
      serverClient = getServerClient();
    } catch (clientError) {
      console.error('[save-assessment] step:client_error', { 
        error: clientError.message,
        context: process.env.CONTEXT
      });
      return json(500, { error: "database_not_available", missing: ["SUPABASE configuration"] });
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

    const { assessmentInputs, answers, scores, planSlug = 'founding-member' } = payload;

    // Normalize data
    const normalizedEmail = assessmentInputs.email_entered.toLowerCase().trim();
    const normalizedName = assessmentInputs.full_name_entered.trim();
    const normalizedCity = assessmentInputs.city.trim();
    const companyName = answers.businessName?.trim() || null;

    console.log('[save-assessment] step:upsert_profile', { 
      email: normalizedEmail, 
      context: process.env.CONTEXT 
    });

    // 1. Upsert profile using email_entered
    let profileId;
    try {
      // Check if profile exists
      const { data: existingProfile, error: lookupError } = await serverClient
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (lookupError) {
        console.error('[save-assessment] step:profile_lookup', { error: lookupError });
        return json(500, { success: false, error: 'db' });
      }

      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await serverClient
          .from('profiles')
          .update({
            full_name: normalizedName,
            company_name: companyName,
            city: normalizedCity,
            state: assessmentInputs.state
          })
          .eq('email', normalizedEmail)
          .select('id')
          .single();

        if (updateError) {
          console.error('[save-assessment] step:profile_update', { error: updateError });
          return json(500, { success: false, error: 'db' });
        }
        profileId = updatedProfile.id;
      } else {
        // Create new auth user via service role
        const { data: authUser, error: authError } = await serverClient.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true
        });

        if (authError) {
          console.error('[save-assessment] step:auth_user_creation', { error: authError });
          return json(500, { success: false, error: 'db' });
        }

        // Insert new profile with auth user id
        const { data: newProfile, error: insertError } = await serverClient
          .from('profiles')
          .insert({
            id: authUser.user.id,
            email: normalizedEmail,
            full_name: normalizedName,
            company_name: companyName,
            city: normalizedCity,
            state: assessmentInputs.state
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[save-assessment] step:profile_creation', { error: insertError });
          return json(500, { success: false, error: 'db' });
        }
        profileId = newProfile.id;
      }

      console.log('[save-assessment] step:profile_success', { profileId });

    } catch (profileError) {
      console.error('[save-assessment] step:profile_error', { error: profileError });
      return json(500, { success: false, error: 'db' });
    }

    // 2. Insert assessment
    try {
      const assessmentData = {
        profile_id: profileId,
        email_entered: normalizedEmail,
        full_name_entered: normalizedName,
        city: normalizedCity,
        state: assessmentInputs.state,
        answers: answers,
        scores: {
          operational: scores.operational,
          licensing: scores.licensing,
          feedback: scores.feedback,
          certifications: scores.certifications,
          digital: scores.digital,
          total: scores.total,
          grade: scores.grade,
          isEligibleForCertification: scores.isEligibleForCertification,
          eligibilityReasons: scores.eligibilityReasons,
          opportunities: scores.opportunities
        },
        intended_membership_tier: planSlug
      };

      const { data: assessment, error: assessmentError } = await serverClient
        .from('assessments')
        .insert(assessmentData)
        .select('id')
        .single();

      if (assessmentError) {
        console.error('[save-assessment] step:assessment_creation', { error: assessmentError });
        return json(500, { success: false, error: 'db' });
      }

      console.log('[save-assessment] step:assessment_success', { 
        assessmentId: assessment.id,
        profileId,
        context: process.env.CONTEXT 
      });

      return json(200, {
        success: true,
        assessment_id: assessment.id,
        profile_id: profileId
      });

    } catch (assessmentError) {
      console.error('[save-assessment] step:assessment_error', { error: assessmentError });
      return json(500, { success: false, error: 'db' });
    }

  } catch (error) {
    console.error('[save-assessment] step:unhandled_error', { 
      error: error,
      context: process.env.CONTEXT 
    });
    return json(500, { success: false, error: 'db' });
  }
};