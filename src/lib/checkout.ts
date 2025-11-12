export interface CheckoutPayload {
  assessmentId?: string | number;
  intendedTier: string;
}

import { FUNCTION_ENDPOINTS } from './functions';

const CHECKOUT_ENDPOINT = FUNCTION_ENDPOINTS.CHECKOUT;

export const startCheckout = async (
  assessmentId?: string | number,
  intendedTier: string = 'Founding Member',
): Promise<void> => {
  const payload: CheckoutPayload = {
    intendedTier,
  };

  if (typeof assessmentId !== 'undefined' && assessmentId !== null) {
    payload.assessmentId = assessmentId;
  }

  const response = await fetch(CHECKOUT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to initiate checkout. Status: ${response.status}. Message: ${errorText}`,
    );
  }

  const data: { url?: string } = await response.json();

  if (!data.url) {
    throw new Error('Checkout session did not return a redirect URL.');
  }

  window.location.href = data.url;
};
