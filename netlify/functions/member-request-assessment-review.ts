import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';

// Run this once in Supabase SQL editor if request_type does not yet include 'assessment_recheck':
// ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'assessment_recheck';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (statusCode: number, body: unknown) => ({
    statusCode,
    headers,
    body: JSON.stringify(body),
});

interface RequestBody {
    profileId?: string;
    assessmentId?: string;
    note?: string;
}

export const handler: Handler = async event => {
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, { ok: true });
    }

    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, { error: 'Method Not Allowed' });
    }

    let parsedBody: RequestBody;
    try {
        parsedBody = JSON.parse(event.body ?? '{}');
    } catch (parseError) {
        console.error('[member-request-assessment-review] Failed to parse request body', parseError);
        return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const { profileId, assessmentId, note } = parsedBody;

    if (!profileId || !assessmentId) {
        return jsonResponse(400, { error: 'profileId and assessmentId are required' });
    }

    const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, total_score, pci_rating')
        .eq('id', assessmentId)
        .maybeSingle();

    if (assessmentError) {
        console.error('[member-request-assessment-review] Failed to load assessment', assessmentError);
    }

    let description = 'Member requested assessment recheck.';

    if (assessment?.pci_rating || assessment?.total_score) {
        description = `Member requested assessment recheck. Latest PCI rating: ${assessment?.pci_rating ?? 'N/A'} – Total score: ${assessment?.total_score ?? 'N/A'}.`;
    } else if (note) {
        description = note;
    }

    const { data: serviceRequest, error: insertError } = await supabase
        .from('service_requests')
        .insert({
            profile_id: profileId,
            request_type: 'assessment_recheck',
            title: 'Assessment recheck requested',
            description,
            status: 'open',
            priority: 'normal',
            source: 'member_portal',
        })
        .select()
        .single();

    if (insertError) {
        console.error('[member-request-assessment-review] Failed to create request', insertError);
        return jsonResponse(500, {
            error: 'Failed to create assessment recheck request',
            details: insertError.message,
        });
    }

    return jsonResponse(200, { serviceRequest });
};
