import { FUNCTION_ENDPOINTS } from './functions';

const CHECKOUT_ENDPOINT = FUNCTION_ENDPOINTS.CHECKOUT;

export interface StartCheckoutParams {
  assessmentId: string | number;
  profileId: string;
  email: string;
}

const resolvePriceId = (): string | undefined => {
  const globalProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
  const fromProcess: string | undefined = globalProcess?.env?.PRICE_ID_FOUNDING_MEMBER;
  const fromVite = (import.meta.env as Record<string, string | undefined>).VITE_PRICE_ID_FOUNDING_MEMBER;
  return fromProcess || fromVite;
};

export const startCheckout = async ({ assessmentId, profileId, email }: StartCheckoutParams): Promise<void> => {
  if (!assessmentId || !profileId || !email) {
    throw new Error('Missing required checkout identifiers.');
  }

  const priceId = resolvePriceId();

  if (!priceId) {
    throw new Error('PRICE_ID_FOUNDING_MEMBER is not configured.');
  }

  const payload = {
    assessment_id: assessmentId,
    profile_id: profileId,
    email,
    price_id: priceId,
  };

  try {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[Checkout] create-checkout-session failed:', {
        status: response.status,
        payload,
        responseText,
      });
      throw new Error(`Failed to initiate checkout. Status: ${response.status}`);
    }

    const data: { url?: string } = await response.json();

    if (!data.url) {
      console.error('[Checkout] create-checkout-session missing redirect URL:', { payload, data });
      throw new Error('Checkout session did not return a redirect URL.');
    }

    window.location.href = data.url;
  } catch (error) {
    console.error('[Checkout] create-checkout-session error:', { error, payload });
    throw error;
  }
};
