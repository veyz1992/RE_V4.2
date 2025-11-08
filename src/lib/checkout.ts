export interface CheckoutPayload {
  tier: string;
  email: string;
  assessmentId?: string | number;
}

const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout-session';

export const startCheckout = async (
  tier: string,
  email: string,
  assessmentId?: string | number,
): Promise<void> => {
  const payload: CheckoutPayload = {
    tier,
    email,
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
