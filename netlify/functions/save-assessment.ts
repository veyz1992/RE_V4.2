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

const normalizeId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
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
    const providedUserId = normalizeString(payload.user_id ?? payload.userId);
    let profileId = normalizeId(payload.profile_id ?? payload.profileId);
    let existingAssessmentId = normalizeId(payload.assessment_id ?? payload.assessmentId);

    const operationalScore = normalizeNumber(payload.operational_score);
    const licensingScore = normalizeNumber(payload.licensing_score);
    const feedbackScore = normalizeNumber(payload.feedback_score);
    const certificationsScore = normalizeNumber(payload.certifications_score);
    const digitalScore = normalizeNumber(payload.digital_score);
    const intendedTier = normalizeString(payload.intended_membership_tier);

    let existingProfile: { id: string; full_name: string | null; city: string | null; state: string | null } | null = null;

    if (profileId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, city, state')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      existingProfile = data ?? null;

      if (!existingProfile) {
        profileId = null;
      }
    }

    if (!profileId) {
      const { data: profileMatch, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id, full_name, city, state')
        .eq('email', email)
        .maybeSingle();

      if (profileLookupError) {
        throw profileLookupError;
      }

      existingProfile = profileMatch ?? null;
    }

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
        .select('id, full_name, city, state')
        .single();

      if (insertProfileError || !insertedProfile) {
        throw insertProfileError ?? new Error('Failed to insert profile');
      }

      profileId = insertedProfile.id;
      existingProfile = insertedProfile;
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

    if (!profileId) {
      throw new Error('Unable to resolve profile');
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

    if (providedUserId) {
      assessmentRow.user_id = providedUserId;
    } else if (!existingAssessmentId) {
      assessmentRow.user_id = null;
    }

    if (!existingAssessmentId && profileId && scenario) {
      const { data: existingAssessment, error: lookupError } = await supabase
        .from('assessments')
        .select('id')
        .eq('profile_id', profileId)
        .eq('scenario', scenario)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existingAssessment?.id) {
        existingAssessmentId = normalizeId(existingAssessment.id);
      }
    }

    console.log('[save-assessment] persisting assessment', {
      profileId,
      scenario,
      hasExisting: Boolean(existingAssessmentId),
    });

    let savedAssessmentId: string | null = null;

    if (existingAssessmentId) {
      const { data: updatedAssessment, error: updateError } = await supabase
        .from('assessments')
        .update(assessmentRow)
        .eq('id', existingAssessmentId)
        .select('id')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      savedAssessmentId = normalizeId(updatedAssessment?.id) ?? existingAssessmentId;
    } else {
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert(assessmentRow)
        .select('id')
        .single();

      if (assessmentError || !assessment) {
        throw assessmentError ?? new Error('Failed to save assessment');
      }

      savedAssessmentId = normalizeId(assessment.id);
    }

    console.log('[save-assessment] saved assessment', {
      profileId,
      scenario,
      assessmentId: savedAssessmentId,
    });

    return json(200, {
      success: true,
      profile_id: profileId,
      assessment_id: savedAssessmentId,
      email,
      scenario,
    });
  } catch (error) {
    console.error('[save-assessment] error', error);
    return json(500, { error: 'ASSESSMENT_SAVE_FAILED' });
  }
};
