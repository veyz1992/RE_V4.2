import { FUNCTION_ENDPOINTS } from './functions';

const CHECKOUT_ENDPOINT = FUNCTION_ENDPOINTS.CHECKOUT;

export interface StartCheckoutParams {
  assessmentId: string | number;
  email: string;
  plan: 'founding-member';
  profileId?: string | null;
  metadata?: Record<string, string | null | undefined>;
}

export interface CheckoutSessionResponse {
  url: string;
  id: string;
}

export const startCheckout = async ({ assessmentId, email, plan, profileId, metadata }: StartCheckoutParams): Promise<CheckoutSessionResponse> => {
  if (!assessmentId || !email || !plan) {
    throw new Error('Missing required checkout identifiers.');
  }

  const payload = {
    assessment_id: String(assessmentId),
    email,
    plan,
    profile_id: profileId ?? null,
    metadata: metadata ?? undefined,
  };

  try {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Checkout] create-checkout-session failed:', {
        status: response.status,
        payload,
        responseText,
      });
      throw new Error(`Failed to initiate checkout. Status: ${response.status}`);
    }

    let data: { url?: string; id?: string } = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('[Checkout] create-checkout-session parse error:', { payload, responseText, parseError });
      throw new Error('Checkout session response was not valid JSON.');
    }

    if (!data.url || !data.id) {
      console.error('[Checkout] create-checkout-session missing data:', { payload, data });
      throw new Error('Checkout session did not return the expected data.');
    }

    return { url: data.url, id: data.id };
  } catch (error) {
    console.error('[Checkout] create-checkout-session error:', { error, payload });
    throw error;
  }
};
