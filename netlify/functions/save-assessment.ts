import { createServerSupabase } from '../lib/supabaseServer.js';
import { randomUUID } from 'crypto';

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
    console.debug('[save-assessment] Request received');

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    // Parse body
    let body;
    try {
      body = JSON.parse(event.body);
      console.debug('[save-assessment] Body parsed:', { hasAnswers: !!body.answers, hasScores: !!body.scores });
    } catch (e) {
      return json(400, { error: 'INVALID_JSON' });
    }

    // Validate required fields
    const { answers, total_score, scores, scenario, email, full_name, city, state, intended_membership_tier } = body;

    if (!answers || !email || !full_name || !city || !state) {
      console.error('[save-assessment] Missing required fields');
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (!scores || typeof scores.operational === 'undefined' || typeof scores.licensing === 'undefined' || 
        typeof scores.feedback === 'undefined' || typeof scores.certifications === 'undefined' || 
        typeof scores.digital === 'undefined') {
      console.error('[save-assessment] Missing required score fields');
      return json(400, { error: 'MISSING_SCORE_FIELDS' });
    }

    // Create Supabase client
    let supabase;
    try {
      supabase = createServerSupabase();
    } catch (envError) {
      console.error('[save-assessment] Environment error:', envError.message);
      return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.debug('[save-assessment] Upserting profile for:', normalizedEmail);

    // 1. Upsert profile by email
    let profileId;
    try {
      // Check if profile exists
      const { data: existingProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (lookupError) {
        console.error('[save-assessment] Profile lookup error:', lookupError.stack || lookupError);
        return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
      }

      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: full_name.trim(),
            city: city.trim(),
            state: state,
            membership_tier: intended_membership_tier || null
          })
          .eq('email', normalizedEmail)
          .select('id')
          .single();

        if (updateError) {
          console.error('[save-assessment] Profile update error:', updateError.stack || updateError);
          return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
        }
        profileId = updatedProfile.id;
        console.debug('[save-assessment] Updated existing profile:', profileId);
      } else {
        // Generate UUID and insert new profile
        profileId = randomUUID();
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: profileId,
            email: normalizedEmail,
            full_name: full_name.trim(),
            city: city.trim(),
            state: state,
            role: 'member',
            membership_tier: intended_membership_tier || null
          });

        if (insertError) {
          console.error('[save-assessment] Profile insert error:', insertError.stack || insertError);
          return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
        }
        console.debug('[save-assessment] Created new profile:', profileId);
      }
    } catch (profileError) {
      console.error('[save-assessment] Profile upsert error:', profileError.stack || profileError);
      return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
    }

    // 2. Insert assessment
    try {
      const assessmentData = {
        email_entered: normalizedEmail,
        full_name_entered: full_name.trim(),
        city: city.trim(),
        state: state,
        answers: answers,
        total_score: total_score,
        operational_score: scores.operational,
        licensing_score: scores.licensing,
        feedback_score: scores.feedback,
        certifications_score: scores.certifications,
        digital_score: scores.digital,
        scenario: scenario || null,
        intended_membership_tier: intended_membership_tier || null,
        profile_id: profileId
      };

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert(assessmentData)
        .select('id')
        .single();

      if (assessmentError) {
        console.error('[save-assessment] Assessment insert error:', assessmentError.stack || assessmentError);
        return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
      }

      console.debug('[save-assessment] Successfully saved assessment:', assessment.id);

      return json(200, {
        success: true,
        profile_id: profileId,
        assessment_id: assessment.id,
        email: normalizedEmail
      });

    } catch (assessmentError) {
      console.error('[save-assessment] Assessment error:', assessmentError.stack || assessmentError);
      return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
    }

  } catch (error) {
    console.error('[save-assessment] Unhandled error:', error.stack || error);
    return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
  }
};