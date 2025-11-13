import { createServerSupabase } from '../lib/supabaseServer.js';
import { randomUUID } from 'crypto';

type SaveAssessmentPayload = {
  answers: Record<string, unknown>;
  total_score: number;
  scenario: string;
  email: string;
  full_name: string;
  business: string;
  city: string;
  state: string;
  intended_membership_tier?: string | null;
  score_breakdown?: Record<string, unknown> | null;
};

const REQUIRED_FIELDS: Array<{ key: keyof SaveAssessmentPayload; type: 'string' | 'number' | 'object' }> = [
  { key: 'answers', type: 'object' },
  { key: 'total_score', type: 'number' },
  { key: 'scenario', type: 'string' },
  { key: 'email', type: 'string' },
  { key: 'full_name', type: 'string' },
  { key: 'business', type: 'string' },
  { key: 'city', type: 'string' },
  { key: 'state', type: 'string' },
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toInt = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
};

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
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch (e) {
      return json(400, { error: 'INVALID_JSON' });
    }

    if (!isRecord(body)) {
      console.error('[save-assessment] Body is not a record');
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', missing: REQUIRED_FIELDS.map(field => field.key) });
    }

    console.log('[save-assessment] Body keys received:', Object.keys(body));

    const missing: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const value = body[field.key];
      switch (field.type) {
        case 'object': {
          if (!isRecord(value)) {
            missing.push(field.key);
          }
          break;
        }
        case 'number': {
          if (typeof value !== 'number' || Number.isNaN(value)) {
            missing.push(field.key);
          }
          break;
        }
        case 'string': {
          if (typeof value !== 'string' || value.trim().length === 0) {
            missing.push(field.key);
          }
          break;
        }
      }
    }

    if (missing.length > 0) {
      console.error('[save-assessment] Missing or invalid fields detected:', missing);
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', missing });
    }

    const payload = body as SaveAssessmentPayload;
    const answers = payload.answers;
    const scoreBreakdown = isRecord(payload.score_breakdown) ? payload.score_breakdown : null;
    const intendedMembershipTier =
      typeof payload.intended_membership_tier === 'string' && payload.intended_membership_tier.trim().length > 0
        ? payload.intended_membership_tier.trim()
        : null;

    const normalizedEmail = payload.email.toLowerCase().trim();
    const fullName = payload.full_name.trim();
    const city = payload.city.trim();
    const state = payload.state.trim();
    const businessName = payload.business.trim();
    const scenario = payload.scenario.trim();
    const totalScore = toInt(payload.total_score);

    // Create Supabase client
    let supabase;
    try {
      supabase = createServerSupabase();
    } catch (envError) {
      console.error('[save-assessment] Environment error:', envError.message);
      return json(500, { success: false, error: 'ASSESSMENT_SAVE_FAILED' });
    }

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
            full_name: fullName,
            company_name: businessName,
            city,
            state,
            membership_tier: intendedMembershipTier || null
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
            full_name: fullName,
            company_name: businessName,
            city,
            state,
            role: 'member',
            membership_tier: intendedMembershipTier || null
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
      const getScore = (key: string): number | null => {
        if (!scoreBreakdown) return null;
        const value = scoreBreakdown[key];
        return typeof value === 'number' ? toInt(value) : null;
      };

      const grade = scoreBreakdown && typeof scoreBreakdown['grade'] === 'string'
        ? (scoreBreakdown['grade'] as string)
        : null;

      const assessmentData = {
        email_entered: normalizedEmail,
        full_name_entered: fullName,
        city,
        state,
        answers: answers,
        total_score: totalScore,
        operational_score: getScore('operational'),
        licensing_score: getScore('licensing'),
        feedback_score: getScore('feedback'),
        certifications_score: getScore('certifications'),
        digital_score: getScore('digital'),
        scenario: scenario || null,
        pci_rating: grade,
        intended_membership_tier: intendedMembershipTier || null,
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
        assessment_id: assessment.id,
        profile_id: profileId,
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