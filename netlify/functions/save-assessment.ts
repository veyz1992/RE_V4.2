import type { Handler } from '@netlify/functions';
import { assertEnv } from '../lib/assertEnv';
import { supabase } from '../lib/supabaseServer';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const handler: Handler = async event => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    if (!event.body) {
      return json(400, { error: 'INVALID_PAYLOAD' });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return json(400, { error: 'INVALID_PAYLOAD' });
    }

    assertEnv();

    const email = normalizeString(payload.email)?.toLowerCase();
    const answers = payload.answers;
    const totalScore = normalizeNumber(payload.total_score);
    const scenario = normalizeString(payload.scenario);

    if (!email || !answers || typeof answers !== 'object' || Array.isArray(answers) || totalScore === null || !scenario) {
      return json(400, { error: 'INVALID_PAYLOAD' });
    }

    const fullName = normalizeString(payload.full_name);
    const city = normalizeString(payload.city);
    const state = normalizeString(payload.state);

    const operationalScore = normalizeNumber(payload.operational_score);
    const licensingScore = normalizeNumber(payload.licensing_score);
    const feedbackScore = normalizeNumber(payload.feedback_score);
    const certificationsScore = normalizeNumber(payload.certifications_score);
    const digitalScore = normalizeNumber(payload.digital_score);
    const intendedTier = normalizeString(payload.intended_membership_tier);

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id, full_name, city, state, email, stripe_customer_id')
      .eq('email', email)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    let profileId: string;

    if (!existingProfile) {
      try {
        const { error: createUserError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: fullName ?? undefined,
            city: city ?? undefined,
            state: state ?? undefined,
          },
        });

        if (createUserError && createUserError.status !== 422) {
          // 422 typically indicates the user already exists; treat other errors as fatal
          throw createUserError;
        }
      } catch (authError: any) {
        if (authError?.status !== 422) {
          throw authError;
        }
      }

      const { data: insertedProfile, error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          email,
          full_name: fullName ?? null,
          city: city ?? null,
          state: state ?? null,
        })
        .select('id')
        .single();

      if (insertProfileError || !insertedProfile) {
        throw insertProfileError ?? new Error('Failed to insert profile');
      }

      profileId = insertedProfile.id;
    } else {
      profileId = existingProfile.id;

      const profileUpdates: Record<string, string | null> = {};
      if (fullName && fullName !== existingProfile.full_name) {
        profileUpdates.full_name = fullName;
      }
      if (city && city !== existingProfile.city) {
        profileUpdates.city = city;
      }
      if (state && state !== existingProfile.state) {
        profileUpdates.state = state;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', profileId);

        if (updateProfileError) {
          throw updateProfileError;
        }
      }
    }

    const assessmentRow: Record<string, unknown> = {
      profile_id: profileId,
      email_entered: email,
      answers,
      total_score: totalScore,
      operational_score: operationalScore,
      licensing_score: licensingScore,
      feedback_score: feedbackScore,
      certifications_score: certificationsScore,
      digital_score: digitalScore,
      scenario,
      intended_membership_tier: intendedTier ?? null,
      full_name_entered: fullName ?? null,
      city,
      state,
    };

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert(assessmentRow)
      .select('id')
      .single();

    if (assessmentError || !assessment) {
      throw assessmentError ?? new Error('Failed to save assessment');
    }

    return json(200, {
      success: true,
      profile_id: profileId,
      assessment_id: assessment.id,
      email,
    });
  } catch (error) {
    console.error('[save-assessment] error', error);
    return json(500, { error: 'ASSESSMENT_SAVE_FAILED' });
  }
};
