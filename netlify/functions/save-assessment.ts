import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseServer';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    if (!event.body) {
      return json(400, { error: 'EMPTY_BODY' });
    }

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return json(400, { error: 'INVALID_JSON' });
    }

    const requiredFields: Array<keyof typeof payload> = ['email', 'answers', 'total_score', 'scenario'];
    const missing = requiredFields.filter((field) => {
      const value = payload[field];
      if (value === null || value === undefined) return true;
      if (field === 'email' || field === 'scenario') {
        return typeof value !== 'string' || value.trim().length === 0;
      }
      return false;
    });

    if (missing.length > 0) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', details: missing });
    }

    const email = normalizeString(payload.email)?.toLowerCase();
    if (!email) {
      return json(400, { error: 'INVALID_EMAIL' });
    }

    const profileFields = {
      name: normalizeString(payload.name ?? payload.full_name ?? null),
      city: normalizeString(payload.city),
      state: normalizeString(payload.state)
    };

    const answers = payload.answers;
    const totalScore = typeof payload.total_score === 'number' ? payload.total_score : Number(payload.total_score);
    const scenario = normalizeString(payload.scenario);

    if (!scenario || Number.isNaN(totalScore)) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', details: ['total_score', 'scenario'] });
    }

    const { data: existingProfile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('email', email)
      .maybeSingle();

    if (fetchProfileError) {
      throw fetchProfileError;
    }

    let profileId = existingProfile?.id ?? null;

    if (!profileId) {
      const { data: insertedProfile, error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({ email })
        .select('id')
        .single();

      if (insertProfileError) {
        throw insertProfileError;
      }

      profileId = insertedProfile.id;
    }

    const assessmentRow = {
      user_id: payload.user_id ?? null,
      profile_id: profileId,
      email_entered: email,
      answers,
      total_score: totalScore,
      operational_score: payload.operational_score ?? null,
      licensing_score: payload.licensing_score ?? null,
      feedback_score: payload.feedback_score ?? null,
      certifications_score: payload.certifications_score ?? null,
      digital_score: payload.digital_score ?? null,
      scenario,
      pci_rating: payload.pci_rating ?? null,
      intended_membership_tier: payload.intended_membership_tier ?? null,
      full_name_entered: profileFields.name,
      state: profileFields.state,
      city: profileFields.city
    };

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .insert(assessmentRow)
      .select('id')
      .single();

    if (assessmentError) {
      throw assessmentError;
    }

    return json(200, { success: true, assessment_id: assessment.id, profile_id: profileId });
  } catch (error: any) {
    console.error('[save-assessment] error', error);
    return json(500, { error: 'ASSESSMENT_SAVE_FAILED', message: error?.message ?? 'Unknown error' });
  }
};
