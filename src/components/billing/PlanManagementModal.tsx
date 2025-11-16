import React, { useMemo } from 'react';
import { PLANS, type MembershipTier, type PlanDefinition, normalizePlanTier } from '@/config/plans';

interface PlanManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: MembershipTier;
}

const getPlanActionLabel = (plan: PlanDefinition, currentSortOrder: number): string => {
  if (plan.sortOrder > currentSortOrder) {
    return `Upgrade to ${plan.name}`;
  }
  if (plan.sortOrder < currentSortOrder) {
    return `Downgrade to ${plan.name}`;
  }
  return 'Current plan';
};

const PlanManagementModal: React.FC<PlanManagementModalProps> = ({ isOpen, onClose, currentTier }) => {
  if (!isOpen) {
    return null;
  }

  const normalizedTier = normalizePlanTier(currentTier);
  const currentPlan = PLANS.find((plan) => plan.id === normalizedTier) ?? null;
  const currentSortOrder = currentPlan?.sortOrder ?? -1;

  const plansToDisplay = useMemo(() => {
    return PLANS.filter((plan) => {
      if (plan.id === 'founding-member') {
        return normalizedTier === 'founding-member';
      }
      return plan.isPubliclyAvailable;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [normalizedTier]);

  const handleChangePlan = (targetTier: MembershipTier) => {
    // TODO: Implement plan change workflow via Stripe/Supabase
    console.log('TODO: change plan from', normalizedTier, 'to', targetTier);
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
          <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">Compare and change your plan</h2>
          <p className="text-[var(--text-muted)]">
            See what’s included in each membership and switch when you’re ready.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plansToDisplay.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan?.id;
            const actionLabel = getPlanActionLabel(plan, currentSortOrder);
            const buttonDisabled = isCurrentPlan;
            const isUpgrade = plan.sortOrder > currentSortOrder;
            const buttonClasses = buttonDisabled
              ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
              : isUpgrade
              ? 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-light)]'
              : 'bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]';

            return (
              <div
                key={plan.id}
                className={`flex h-full flex-col rounded-2xl border p-6 shadow-lg ${
                  isCurrentPlan ? 'border-[var(--accent)] bg-[var(--accent-bg-subtle)]/30' : 'border-[var(--border-subtle)]'
                }`}
              >
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">Plan</p>
                    {isCurrentPlan && (
                      <span className="rounded-full bg-[var(--accent-bg-subtle)] px-3 py-0.5 text-xs font-semibold text-[var(--accent-dark)]">
                        Your current plan
                      </span>
                    )}
                    {plan.badgeLabel && (
                      <span className="rounded-full bg-amber-200/70 px-3 py-0.5 text-xs font-bold text-amber-900">
                        {plan.badgeLabel}
                      </span>
                    )}
                  </div>
                  <h3 className="font-playfair text-2xl font-bold text-[var(--text-main)]">{plan.name}</h3>
                  <p className="text-lg font-semibold text-[var(--text-main)]">{plan.priceLabel}</p>
                  {plan.description && <p className="text-sm text-[var(--text-muted)]">{plan.description}</p>}
                </div>
                <ul className="flex flex-1 flex-col gap-4">
                  {plan.benefits.map((benefit) => (
                    <li key={`${plan.id}-${benefit.key}-${benefit.label}`} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-main)]">{benefit.label}</p>
                        {benefit.detail && <p className="text-xs text-[var(--text-muted)]">{benefit.detail}</p>}
                      </div>
                      {benefit.quotaLabel && (
                        <span className="text-xs font-medium text-[var(--text-muted)]">{benefit.quotaLabel}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={buttonDisabled}
                  onClick={() => handleChangePlan(plan.id)}
                  className={`mt-6 w-full rounded-xl py-3 text-center text-sm font-bold transition-colors ${buttonClasses}`}
                >
                  {actionLabel}
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
