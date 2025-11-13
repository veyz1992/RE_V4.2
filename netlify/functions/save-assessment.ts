import { createServerSupabase } from '../lib/supabaseServer.js';
import { checkRequiredEnv } from '../lib/assertEnv.js';

type ScoreBreakdown = {
  operational?: number;
  licensing?: number;
  feedback?: number;
  certifications?: number;
  digital?: number;
};

type SaveAssessmentPayload = {
  email?: string;
  full_name?: string;
  city?: string;
  state?: string;
  answers?: Record<string, unknown>;
  total_score?: number;
  scenario?: string;
  breakdown?: ScoreBreakdown;
};

type ValidationDetails = {
  missingFields: string[];
  invalidFields: string[];
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toInteger = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
};

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    const envCheck = checkRequiredEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    if (!envCheck.ok) {
      return json(500, { error: 'SERVER_ERROR', message: envCheck.message });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(event.body ?? '{}');
    } catch (parseError) {
      return json(400, { error: 'VALIDATION_ERROR', details: { missingFields: ['answers', 'total_score', 'scenario'], invalidFields: ['body'] } });
    }

    if (!isRecord(parsedBody)) {
      return json(400, { error: 'VALIDATION_ERROR', details: { missingFields: ['answers', 'total_score', 'scenario'], invalidFields: [] } });
    }

    const payload = parsedBody as SaveAssessmentPayload;

    const details: ValidationDetails = {
      missingFields: [],
      invalidFields: [],
    };

    if (!isRecord(payload.answers)) {
      details.missingFields.push('answers');
    }

    if (typeof payload.total_score !== 'number' || Number.isNaN(payload.total_score)) {
      details.missingFields.push('total_score');
    }

    if (typeof payload.scenario !== 'string' || payload.scenario.trim().length === 0) {
      details.missingFields.push('scenario');
    }

    if (details.missingFields.length > 0 || details.invalidFields.length > 0) {
      return json(400, { error: 'VALIDATION_ERROR', details });
    }

    const email = normalizeString(payload.email)?.toLowerCase() ?? null;
    const fullName = normalizeString(payload.full_name);
    const city = normalizeString(payload.city);
    const state = normalizeString(payload.state);
    const scenario = payload.scenario!.trim();
    const totalScore = toInteger(payload.total_score!);

    const breakdown = isRecord(payload.breakdown) ? (payload.breakdown as ScoreBreakdown) : undefined;

    const mapBreakdown = (key: keyof ScoreBreakdown): number | null => {
      if (!breakdown) return null;
      const value = breakdown[key];
      return typeof value === 'number' && Number.isFinite(value) ? toInteger(value) : null;
    };

    let supabase;
    try {
      supabase = createServerSupabase();
    } catch (clientError: any) {
      console.error('[save-assessment] Failed to create Supabase client:', clientError?.message || clientError);
      return json(500, { error: 'SERVER_ERROR' });
    }

    const assessmentInsert: Record<string, unknown> = {
      answers: payload.answers,
      total_score: totalScore,
      scenario,
    };

    if (email) assessmentInsert.email_entered = email;
    if (fullName) assessmentInsert.full_name_entered = fullName;
    if (city) assessmentInsert.city = city;
    if (state) assessmentInsert.state = state;

    const operationalScore = mapBreakdown('operational');
    const licensingScore = mapBreakdown('licensing');
    const feedbackScore = mapBreakdown('feedback');
    const certificationsScore = mapBreakdown('certifications');
    const digitalScore = mapBreakdown('digital');

    if (operationalScore !== null) assessmentInsert.operational_score = operationalScore;
    if (licensingScore !== null) assessmentInsert.licensing_score = licensingScore;
    if (feedbackScore !== null) assessmentInsert.feedback_score = feedbackScore;
    if (certificationsScore !== null) assessmentInsert.certifications_score = certificationsScore;
    if (digitalScore !== null) assessmentInsert.digital_score = digitalScore;

    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert(assessmentInsert)
        .select('id, email_entered')
        .single();

      if (error || !data) {
        console.error('[save-assessment] Supabase insert error:', error?.message || error);
        return json(500, { error: 'SERVER_ERROR' });
      }

      return json(200, {
        success: true,
        assessment_id: data.id,
        profile_id: null,
        email: data.email_entered ?? email,
      });
    } catch (dbError: any) {
      console.error('[save-assessment] Unexpected Supabase error:', dbError?.message || dbError);
      return json(500, { error: 'SERVER_ERROR' });
    }
  } catch (unhandledError: any) {
    console.error('[save-assessment] Unhandled error:', unhandledError?.message || unhandledError);
    return json(500, { error: 'SERVER_ERROR' });
  }
};
