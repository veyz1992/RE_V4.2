export interface CheckoutPayload {
  tier: string;
  email: string;
  assessmentId?: string | number;
  fullName?: string;
  state?: string;
  city?: string;
}

const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout-session';

export const startCheckout = async (
  tier: string,
  email: string,
  assessmentId?: string | number,
  fullName?: string,
  state?: string,
  city?: string,
): Promise<void> => {
  const payload: CheckoutPayload = {
    tier,
    email,
  };

  if (typeof assessmentId !== 'undefined' && assessmentId !== null) {
    payload.assessmentId = assessmentId;
  }
  
  if (fullName) payload.fullName = fullName;
  if (state) payload.state = state;
  if (city) payload.city = city;

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
