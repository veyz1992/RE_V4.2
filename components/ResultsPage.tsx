import React, { useState, useEffect } from 'react';
import PricingCard from './PricingCard';
import FoundingMemberModal from './FoundingMemberModal';
import { FOUNDING_MEMBER_SPOTS_REMAINING } from '../constants';
import { StoredAssessmentResult, Opportunity } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from './icons';
import { startCheckout } from '@/lib/checkout';

const PLAN_STORAGE_KEY = 'restorationexpertise:last-plan';
const EMAIL_STORAGE_KEY = 'restorationexpertise:last-email';

const AnimatedScore: React.FC<{ score: number }> = ({ score }) => {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        let animationFrameId: number;
        const duration = 1500; // Animation duration in ms
        const startTimestamp = performance.now();

        const step = (timestamp: number) => {
            const elapsedTime = timestamp - startTimestamp;
            const progress = Math.min(elapsedTime / duration, 1); // Value from 0 to 1
            
            setDisplayScore(Math.round(progress * score));

            // Continue the animation if not finished
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        // Start the animation
        animationFrameId = requestAnimationFrame(step);

        // Cleanup function to cancel the animation frame
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [score]);

    const getScoreColor = (s: number) => {
        if (s < 45) return 'text-error';
        if (s < 60) return 'text-warning';
        if (s >= 70) return 'text-success';
        return 'text-gold';
    };
    
    const circumference = 2 * Math.PI * 55; // 2 * pi * radius
    const strokeDashoffset = circumference - (displayScore / 100) * circumference;

    return (
        <div className="relative w-40 h-40">
            <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="55" cx="60" cy="60" />
                <circle
                    className={getScoreColor(score)}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="55"
                    cx="60"
                    cy="60"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.5s ease-out' }}
                />
            </svg>
            <div className={`absolute inset-0 flex flex-col items-center justify-center font-sora font-bold ${getScoreColor(score)}`}>
                 <span className="text-5xl">{displayScore}</span>
                 <span className="text-lg -mt-1">/ 100</span>
            </div>
        </div>
    );
};

const OpportunitiesSection: React.FC<{ opportunities: Opportunity[] }> = ({ opportunities }) => {
    if (opportunities.length === 0) {
        return (
            <div className="max-w-5xl mx-auto mt-12 animate-slide-up" style={{ animationDelay: '600ms' }}>
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-border">
                    <h2 className="font-sora text-3xl font-bold text-charcoal mb-4 text-center">Top Opportunities</h2>
                    <div className="flex items-center justify-center gap-3 bg-success/10 p-4 rounded-lg">
                        <CheckCircleIcon className="w-8 h-8 text-success shrink-0" />
                        <p className="text-lg font-semibold text-green-800">You’ve checked off every major credibility signal in our model. Strong work!</p>
                    </div>
                </div>
            </div>
        );
    }

    const categoryColors: Record<Opportunity['category'], string> = {
        'Operational': 'bg-blue-100 text-blue-800',
        'Licensing': 'bg-indigo-100 text-indigo-800',
        'Feedback': 'bg-green-100 text-green-800',
        'Digital': 'bg-purple-100 text-purple-800',
        'Certifications': 'bg-yellow-100 text-yellow-800',
    };

    const typeColors: Record<Opportunity['type'], string> = {
        'Quick win': 'border-success text-success',
        'Deep work': 'border-gray-400 text-gray-600',
    };

    return (
        <div className="max-w-5xl mx-auto mt-12 animate-slide-up" style={{ animationDelay: '600ms' }}>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-border">
                <h2 className="font-sora text-3xl font-bold text-charcoal mb-6 text-center">Your Top 3 Opportunities</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {opportunities.map((opp) => (
                        <div key={opp.id} className="bg-gray-light/50 p-6 rounded-xl border border-gray-border flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${categoryColors[opp.category]}`}>{opp.category}</span>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${typeColors[opp.type]}`}>{opp.type}</span>
                            </div>
                            <h3 className="font-bold text-lg text-charcoal leading-tight flex-grow">{opp.label}</h3>
                            <p className="text-sm text-gray-dark mt-2">{opp.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BenefitPreviewModal: React.FC<{ tier: { name: string, features: string[] } | null, onClose: () => void }> = ({ tier, onClose }) => {
    if (!tier) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8 relative animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-8 h-8"/>
                </button>
                
                <div className="text-center">
                    <h2 className="font-sora text-3xl font-bold text-charcoal mb-4">{tier.name} Benefits</h2>
                </div>
                
                <ul className="space-y-3 text-charcoal">
                    {tier.features.map((item, index) => (
                         <li key={index} className="flex items-start">
                            <svg className="w-5 h-5 mr-3 text-success flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-8 text-center">
                     <button onClick={onClose} className="py-2 px-8 bg-gold text-charcoal font-bold rounded-lg shadow-md hover:bg-gold-light">
                       Close
                    </button>
                </div>
            </div>
        </div>
    );
};


interface ResultsPageProps {
    result: StoredAssessmentResult;
    onRetake: () => void;
    onJoin: () => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ result, onRetake, onJoin }) => {
    const { total: score, grade, isEligibleForCertification, eligibilityReasons, opportunities } = result;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewedTier, setPreviewedTier] = useState<{ name: string; features: string[] } | null>(null);

    useEffect(() => {
        if (isEligibleForCertification) {
            const timer = setTimeout(() => {
                setIsModalOpen(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isEligibleForCertification]);

    const beginCheckout = async (tier: string) => {
        const email = result.emailEntered?.trim();

        if (!email) {
            console.error('Email missing from assessment result - this should not happen');
            return;
        }

        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(PLAN_STORAGE_KEY, tier);
                window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
            }
            await startCheckout(
              tier, 
              email, 
              result.id,
              result.fullNameEntered,
              result.state,
              result.cityEntered
            );
        } catch (error) {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(PLAN_STORAGE_KEY);
            }
            console.error('Failed to start Stripe Checkout', error);
            alert('We were unable to start checkout. Please try again or contact support.');
        }
    };

    const handleClaimAndJoin = () => {
        setIsModalOpen(false);
        beginCheckout('Founding Member').catch(() => {
            /* Error surface handled inside beginCheckout */
        });
    };

    if (isEligibleForCertification) {
        // SCENARIO A: ELIGIBLE
        const professionalTitle = score >= 80 ? 'Premier Restoration Professional' : 'Certified Restoration Professional';
        const certificationTitle = `${grade} ${professionalTitle}`;
        
        return (
            <div className="min-h-screen bg-gray-light font-inter p-4 md:p-8">
                <FoundingMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onClaim={handleClaimAndJoin} />
                <div className="bg-gradient-to-br from-success to-green-700 text-white text-center py-12 px-4 rounded-t-2xl animate-slide-up">
                    <div className="text-5xl mb-4">🎉</div>
                    <h1 className="font-sora text-4xl font-bold">Congratulations! You're Eligible for Certification</h1>
                    <p className="text-lg mt-2">Your Professional Credibility Index Score Qualifies You as a <span className="font-bold">{certificationTitle}</span></p>
                </div>
                <div className="max-w-5xl mx-auto -mt-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                     <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-gray-border flex flex-col items-center">
                        <AnimatedScore score={score} />
                        <h2 className="font-sora text-2xl font-bold text-charcoal mt-6">Your Score Breakdown</h2>
                        <div className="w-full max-w-md mt-4 text-center">
                            {/* You would pass the actual breakdown here */}
                            <p className="text-gray">This score reflects your commitment to professional standards, customer satisfaction, and industry excellence.</p>
                        </div>
                    </div>
                </div>
                
                <OpportunitiesSection opportunities={opportunities} />

                {/* Founding Member Banner */}
                <div className="relative max-w-5xl mx-auto mt-24 mb-12">
                    <div className="absolute -top-20 md:-top-32 inset-x-0 flex justify-center pointer-events-none">
                        <img
                            src="https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertise_badge_3d_layingtra_shadow.webp"
                            alt="Restoration Expertise Founding Member Badge"
                            className="w-60 h-auto md:w-96 drop-shadow-badge animate-float-badge hover:animate-paused pointer-events-auto"
                        />
                    </div>
                    <div className="p-8 pt-40 md:pt-64 bg-gradient-to-r from-gold-dark to-founding-gold rounded-2xl text-white shadow-2xl border-2 border-founding-gold">
                        <div className="text-center">
                            <h2 className="font-sora text-3xl font-bold mb-2">🚨 FOUNDING MEMBER OPPORTUNITY</h2>
                            <p className="text-lg text-gold-light mb-4">25 LIFETIME SPOTS ONLY</p>
                            <p className="mb-6">Lock in a lifetime rate of $229/mo. Get an exclusive Founding Member seal, priority placement, and all Gold-tier features.</p>
                            <div className="flex items-center justify-center space-x-4 mb-6 text-xl font-bold">
                                <span>⏰ Offer Expires: December 31, 2025</span>
                                <span className="w-px h-6 bg-white/50"></span>
                                <span>🔒 Only {FOUNDING_MEMBER_SPOTS_REMAINING} spots remaining</span>
                            </div>
                            <button onClick={handleClaimAndJoin} 
                                    className="bg-white text-charcoal font-bold text-lg py-3 px-10 rounded-lg shadow-lg hover:bg-gray-200 transition-transform transform hover:scale-105">
                                CLAIM YOUR FOUNDING MEMBER SPOT →
                            </button>
                        </div>
                    </div>
                </div>

                <h2 className="font-sora text-3xl font-bold text-charcoal text-center mb-8">Choose Your Membership Tier</h2>
                 <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                    <PricingCard
                        tier="Bronze"
                        price="$159"
                        pricePeriod="/mo"
                        features={[
                            'Verified Badge (A+, A, or B+)',
                            'Profile page with SEO backlink',
                            'Basic directory listing',
                            'Community access',
                            'Annual re-verification included'
                        ]}
                        onSelect={() => {}}
                        disabled
                        buttonLabel="Coming Soon"
                        disabledText="Bronze launches soon."
                    />
                    <PricingCard
                        tier="Silver"
                        price="$297"
                        pricePeriod="/mo"
                        features={[
                            'Everything in Bronze, plus:',
                            'Featured placement in directory',
                            'Enhanced profile (logo, gallery, CTA)',
                            'Yearly SEO blog post',
                            'Quarterly compliance check'
                        ]}
                        popular
                        onSelect={() => {}}
                        disabled
                        buttonLabel="Coming Soon"
                        disabledText="Silver launches soon."
                    />
                    <PricingCard
                        tier="Gold"
                        price="$497"
                        pricePeriod="/mo"
                        features={[
                            'Everything in Silver, plus:',
                            'Featured in "Top Verified Experts"',
                            'Priority SEO backlink placement',
                            'Bi-annual spotlight article',
                            'Social media spotlight (2x/year)',
                            '99-Steps Blueprint included'
                        ]}
                        onSelect={() => {}}
                        disabled
                        buttonLabel="Coming Soon"
                        disabledText="Gold launches soon."
                    />
                    <PricingCard
                        tier="Founding Member"
                        price="$229"
                        pricePeriod="/mo" 
                        features={[
                            'Exclusive Founding Member Seal',
                            'Lifetime price lock at $229/mo',
                            'Enhanced Profile & Priority SEO',
                            'Yearly SEO blog post',
                            '99 Steps Blueprint included',
                            'Direct line for priority support',
                        ]} 
                        onSelect={handleClaimAndJoin} 
                        spotsRemaining={FOUNDING_MEMBER_SPOTS_REMAINING} 
                    />
                </div>
                 <div className="text-center mt-12">
                    <button onClick={onRetake} className="text-gray font-semibold hover:underline">Or, retake the assessment</button>
                </div>
            </div>
        );
    } else {
        // SCENARIO B: NOT ELIGIBLE
        const bronzeFeatures = [
            'Verified Badge (A+, A, or B+)', 'Profile page with SEO backlink', 'Basic directory listing',
            'Community access', 'Annual re-verification included'
        ];
        const silverFeatures = [
            'Everything in Bronze, plus:', 'Featured placement in directory', 'Enhanced profile (logo, gallery, CTA)',
            'Yearly SEO blog post', 'Quarterly compliance check'
        ];
        const goldFeatures = [
            'Everything in Silver, plus:', 'Featured in "Top Verified Experts"', 'Priority SEO backlink placement',
            'Bi-annual spotlight article', 'Social media spotlight (2x/year)', '99-Steps Blueprint included'
        ];
        const foundingMemberFeatures = [
            'Exclusive Founding Member Seal', 'Lifetime price lock at $229/mo', 'Enhanced Profile & Priority SEO',
            'Yearly SEO blog post', '99 Steps Blueprint included', 'Direct line for priority support',
        ];

        return (
            <div className="min-h-screen bg-gray-light font-inter p-4 md:p-8">
                <BenefitPreviewModal tier={previewedTier} onClose={() => setPreviewedTier(null)} />
                <div className="bg-gradient-to-br from-gray-700 to-charcoal-dark text-white text-center py-12 px-4 rounded-t-2xl animate-slide-up">
                    <h1 className="font-sora text-4xl font-bold">You’re On Your Way!</h1>
                    <p className="text-lg mt-2 max-w-3xl mx-auto">
                        Your current score is <span className="font-bold">{score}/100 ({grade})</span>. You're not yet eligible for certification, but here’s exactly what you need to improve.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto -mt-8 bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-border animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex flex-col items-center">
                        <AnimatedScore score={score} />
                    </div>

                    <div className="mt-8">
                        <h2 className="font-sora text-2xl font-bold text-charcoal text-center mb-4">What You Need To Qualify</h2>
                        <div className="max-w-2xl mx-auto bg-yellow-50 border-l-4 border-warning p-6 rounded-r-lg">
                            <ul className="space-y-3">
                                {eligibilityReasons.map((reason, index) => (
                                    <li key={index} className="flex items-start">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-warning mr-3 mt-0.5 shrink-0" />
                                        <span className="text-yellow-900 font-medium">{reason}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <OpportunitiesSection opportunities={opportunities} />

                <div className="max-w-5xl mx-auto mt-24 animate-slide-up" style={{ animationDelay: '400ms' }}>
                    <div className="bg-gradient-to-b from-white to-[#f6e9cc] rounded-xl shadow-xl border-2 border-gold text-center pt-8">
                        <img
                            src="https://restorationexpertise.com/wp-content/uploads/2025/11/99successblueprint_3dmockup_2tr_s.webp"
                            alt="99-Step Restoration Success Blueprint Mockup"
                            className="w-4/5 md:w-3/5 mx-auto -mt-28 mb-4 drop-shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:drop-shadow-2xl"
                        />
                        <div className="px-8 pb-8">
                            <h2 className="font-sora text-3xl font-bold text-charcoal mb-4">The 99-Step Restoration Success Blueprint</h2>
                            <p className="text-gray-dark text-lg mb-6">You’re missing a few key credibility signals. Our 99-Step Restoration Success Blueprint gives you a step-by-step roadmap and a live dashboard to track your progress until you qualify for certification.</p>
                            <ul className="space-y-3 mb-8 text-left inline-block">
                                {[
                                    "Clear checklist to fix licensing, operations, and digital presence",
                                    "Quick-win tasks you can tackle this week",
                                    "Built-in progress tracking as you improve your score"
                                ].map(item => (
                                    <li key={item} className="flex items-start">
                                        <CheckCircleIcon className="w-6 h-6 text-success mr-3 shrink-0" />
                                        <span className="text-charcoal text-lg">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <a href="https://restorationexpertise.com/99-steps" target="_blank" rel="noopener noreferrer" className="block w-full text-center py-4 px-8 bg-gold text-charcoal font-bold text-xl rounded-lg shadow-lg hover:bg-gold-light transition-transform transform hover:scale-105">
                                Get the 99-Step Blueprint & Dashboard
                            </a>
                        </div>
                    </div>
                </div>
                
                <p className="max-w-4xl mx-auto text-center text-gray-dark mt-8 px-4">
                    Step 1: Use the Blueprint to fix your gaps. Step 2: Unlock these member benefits once you qualify.
                </p>

                <div className="text-center mt-8">
                     <h2 className="font-sora text-3xl font-bold text-charcoal mb-2">What You’ll Unlock Once You Qualify</h2>
                     <p className="text-gray-dark mb-8">Preview the benefits you’ll access after you meet the certification requirements.</p>
                </div>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                    <PricingCard 
                        tier="Bronze" price="$159" pricePeriod="/mo" features={bronzeFeatures} 
                        onSelect={() => setPreviewedTier({ name: 'Bronze', features: bronzeFeatures })} buttonLabel="Preview benefits" 
                    />
                    <PricingCard
                        tier="Silver" price="$297" pricePeriod="/mo" features={silverFeatures} popular
                        onSelect={() => setPreviewedTier({ name: 'Silver', features: silverFeatures })} buttonLabel="Preview benefits" 
                    />
                    <PricingCard 
                        tier="Gold" price="$497" pricePeriod="/mo" features={goldFeatures} 
                        onSelect={() => setPreviewedTier({ name: 'Gold', features: goldFeatures })} buttonLabel="Preview benefits" 
                    />
                    <PricingCard 
                        tier="Founding Member" price="$229" pricePeriod="/mo" features={foundingMemberFeatures} 
                        onSelect={() => {}} spotsRemaining={FOUNDING_MEMBER_SPOTS_REMAINING} buttonLabel="Claim Spot"
                        disabled={true} disabledText="Available once your business qualifies for certification."
                    />
                </div>
                 <div className="text-center mt-16">
                    <button onClick={onRetake} className="py-3 px-8 bg-gold text-charcoal font-bold text-lg rounded-lg shadow-lg hover:bg-gold-light transition-transform transform hover:scale-105">
                        I’ve improved my business – retake the assessment
                    </button>
                    <p className="text-sm text-gray-dark mt-4">
                        Most contractors reach eligibility within a few weeks once they follow the Blueprint.
                    </p>
                </div>
            </div>
        );
    }
};

export default ResultsPage;