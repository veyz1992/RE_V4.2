export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      context: process.env.DEPLOYMENT_CONTEXT || 'unknown',
      hasSecret: !!process.env.STRIPE_SECRET_KEY,
      hasPriceFM: !!process.env.STRIPE_PRICE_FOUNDING_MEMBER,
      hasWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    }),
  };
};