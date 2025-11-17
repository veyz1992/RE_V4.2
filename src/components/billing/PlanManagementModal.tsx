import React, { useState } from 'react';
import { normalizePlanTier, type MembershipTier } from '@/config/plans';

type PaidMembershipTier = Exclude<MembershipTier, 'free'>;

type TierOption = {
  code: PaidMembershipTier;
  name: string;
  description: string;
};

interface PlanManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: MembershipTier;
  onSelectTier: (tier: PaidMembershipTier) => Promise<void>;
}

const TIER_OPTIONS: TierOption[] = [
  {
    code: 'founding-member',
    name: 'Founding Member',
    description: 'Legacy pricing and concierge support for our earliest partners.',
  },
  {
    code: 'bronze',
    name: 'Bronze',
    description: 'Verified badge and essential visibility inside the network.',
  },
  {
    code: 'silver',
    name: 'Silver',
    description: 'Everything in Bronze plus boosted SEO and compliance reviews.',
  },
  {
    code: 'gold',
    name: 'Gold',
    description: 'Maximum visibility, spotlight placements, and priority support.',
  },
];

const PlanManagementModal: React.FC<PlanManagementModalProps> = ({ isOpen, onClose, currentTier, onSelectTier }) => {
  const [pendingTier, setPendingTier] = useState<PaidMembershipTier | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const normalizedTier = normalizePlanTier(currentTier);

  const handleSelect = async (tier: PaidMembershipTier) => {
    if (tier === normalizedTier || pendingTier) {
      return;
    }

    setPendingTier(tier);
    setErrorMessage(null);

    try {
      await onSelectTier(tier);
    } catch (error) {
      console.error('[PlanManagementModal] Failed to start checkout', error);
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : 'Unable to start checkout right now. Please try again.';
      setErrorMessage(fallbackMessage);
    } finally {
      setPendingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-[var(--bg-card)] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-[var(--bg-subtle)] p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          ×
        </button>
        <div className="space-y-2 pr-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-dark)]">Member plans</p>
          <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">Choose the membership tier for you</h2>
          <p className="text-[var(--text-muted)]">Pick the plan that fits your goals. You can upgrade or downgrade anytime.</p>
        </div>
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {TIER_OPTIONS.map((tier) => {
            const isCurrent = tier.code === normalizedTier;
            const isProcessing = pendingTier === tier.code;
            const buttonDisabled = isCurrent || Boolean(pendingTier);
            return (
              <div
                key={tier.code}
                className={`flex h-full flex-col justify-between rounded-2xl border p-6 shadow-lg transition ${
                  isCurrent
                    ? 'border-[var(--accent)] bg-[var(--accent-bg-subtle)]/40'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-playfair text-2xl font-bold text-[var(--text-main)]">{tier.name}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--accent-bg-subtle)] px-3 py-0.5 text-xs font-semibold text-[var(--accent-dark)]">
                        Current
                      </span>
                    )}
                  </div>
                  {tier.description && <p className="text-sm text-[var(--text-muted)]">{tier.description}</p>}
                </div>
                <button
                  type="button"
                  disabled={buttonDisabled}
                  onClick={() => handleSelect(tier.code)}
                  className={`mt-6 w-full rounded-xl px-6 py-3 text-center text-sm font-bold transition ${
                    buttonDisabled
                      ? 'cursor-not-allowed bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      : 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-light)]'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : isProcessing ? 'Opening checkout…' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlanManagementModal;
