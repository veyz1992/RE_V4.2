

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Answers, ScoreBreakdown, Opportunity, AssessmentInputs } from '../types';
import { ASSESSMENT_STEPS, MAX_SCORES, INITIAL_ANSWERS, US_STATES } from '../constants';
import { CheckCircleIcon, BriefcaseIcon, ShieldCheckIcon, ClipboardDocumentCheckIcon, StarIcon, TrophyIcon, LightBulbIcon } from './icons';
import { supabase } from '../src/lib/supabase';

// Refactored scoring logic to use a linear normalization for a 0-100 score.
const RAW_MAX = {
  operational: 20, // 10 + 5 + 5
  licensing: 10,   // treat 10+ years as “full”
  feedback: 30,    // rating + reviews
  certifications: 20, // 4 x 5
  digital: 17,     // website + pro email + emergency + social + vehicles
};

function getGrade(total: number): 'A+' | 'A' | 'B+' | 'Needs Work' {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 65) return 'B+';
  return 'Needs Work';
}

function evaluateEligibility(answers: Answers, scores: { operational: number; licensing: number; feedback: number; certifications: number; digital: number; total: number }) {
  const reasons: string[] = [];

  if (!answers.hasLicense) reasons.push('No active contractor license on file.');
  if (!answers.hasLiabilityInsurance) reasons.push('No general liability insurance listed.');
  if (scores.operational < 10) reasons.push('Operational standards are below our minimum.');
  if (scores.licensing < 4) reasons.push('Too few years licensed for certification.');
  if (scores.feedback < 5) reasons.push('Customer feedback and reviews are too low.');
  if (scores.digital < 5) reasons.push('Digital & brand presence needs improvement.');
  if (scores.total < 70) reasons.push('Overall score is below the minimum threshold.');

  const isEligible = reasons.length === 0;
  return { isEligible, eligibilityReasons: reasons };
}

const getOpportunities = (answers: Answers): Opportunity[] => {
    const allPossibleOpportunities: (Omit<Opportunity, 'id'> & { id: keyof Answers | string, condition: (answers: Answers) => boolean })[] = [
        // High Impact
        {
            id: 'hasLicense',
            label: 'Get an active contractor license',
            description: "This is a fundamental requirement for certification and a major trust signal for homeowners.",
            category: 'Operational',
            impact: 'High',
            type: 'Deep work',
            condition: (ans) => !ans.hasLicense
        },
        {
            id: 'hasLiabilityInsurance',
            label: 'Secure general liability insurance',
            description: "Liability insurance is a non-negotiable for professional contractors and essential for certification.",
            category: 'Operational',
            impact: 'High',
            type: 'Deep work',
            condition: (ans) => !ans.hasLiabilityInsurance
        },
        {
            id: 'yearsLicensed',
            label: 'Increase years of licensed experience',
            description: "More years of licensed operation build significant credibility. While this takes time, it's a key factor for top-tier status.",
            category: 'Licensing',
            impact: 'High',
            type: 'Deep work',
            condition: (ans) => ans.yearsLicensed < 3
        },
        {
            id: 'googleReviewsLow',
            label: 'Boost your Google review count',
            description: "Reviews are a powerful form of social proof. Aim for at least 20+ high-quality reviews to build authority.",
            category: 'Feedback',
            impact: 'High',
            type: 'Deep work',
            condition: (ans) => ans.googleReviews < 5
        },
        {
            id: 'hasWebsite',
            label: 'Create a professional website',
            description: "A website is your digital storefront. It's a critical asset for establishing credibility and attracting leads.",
            category: 'Digital',
            impact: 'High',
            type: 'Deep work',
            condition: (ans) => !ans.hasWebsite
        },
        // Medium Impact
        {
            id: 'hasWorkersComp',
            label: "Add workers' comp insurance",
            description: "This is a core credibility and compliance signal, especially for businesses with employees. Many adjusters and commercial clients expect it.",
            category: 'Operational',
            impact: 'Medium',
            type: 'Deep work',
            condition: (ans) => !ans.hasWorkersComp
        },
        {
            id: 'googleReviewsMedium',
            label: 'Gather more Google reviews',
            description: "You have a good start, but pushing from 5-10 reviews to 20-40 can significantly increase your local authority and lead flow.",
            category: 'Feedback',
            impact: 'Medium',
            type: 'Quick win',
            condition: (ans) => ans.googleReviews >= 5 && ans.googleReviews < 20
        },
        {
            id: 'googleRating',
            label: 'Improve your Google rating',
            description: "A rating below 4.5 stars can deter potential customers. Focus on delivering excellent service and encouraging happy clients to leave reviews.",
            category: 'Feedback',
            impact: 'Medium',
            type: 'Deep work',
            condition: (ans) => ans.googleRating > 0 && ans.googleRating < 4.5
        },
        {
            id: 'hasProEmail',
            label: 'Set up a professional email address',
            description: "Using an email like 'info@yourcompany.com' instead of a generic Gmail or Yahoo address is a quick way to look more professional.",
            category: 'Digital',
            impact: 'Medium',
            type: 'Quick win',
            condition: (ans) => !ans.hasProEmail
        },
        {
            id: 'certifications',
            label: 'Earn more IICRC certifications',
            description: "Certifications demonstrate a commitment to industry standards and expertise, justifying higher prices and building trust.",
            category: 'Certifications',
            impact: 'Medium',
            type: 'Deep work',
            condition: (ans) => {
                const certCount = (ans.certifications.water ? 1 : 0) + (ans.certifications.fire ? 1 : 0) + (ans.certifications.mold ? 1 : 0) + (ans.certifications.other ? 1 : 0);
                return certCount < 2;
            }
        },
        {
            id: 'emergencyLine',
            label: 'Establish a 24/7 emergency line',
            description: "For restoration, being available 24/7 is critical. Clearly advertising this on your site can significantly increase emergency calls.",
            category: 'Digital',
            impact: 'Medium',
            type: 'Quick win',
            condition: (ans) => !ans.emergencyLine
        }
    ];

    const foundOpportunities = allPossibleOpportunities.filter(opp => opp.condition(answers));

    const impactOrder = { 'High': 1, 'Medium': 2 };
    const typeOrder = { 'Quick win': 1, 'Deep work': 2 };

    foundOpportunities.sort((a, b) => {
        if (impactOrder[a.impact] !== impactOrder[b.impact]) {
            return impactOrder[a.impact] - impactOrder[b.impact];
        }
        return typeOrder[a.type] - typeOrder[b.type];
    });

    return foundOpportunities.slice(0, 3).map(({ condition, ...opp }) => opp);
};

const calculateScore = (answers: Answers): ScoreBreakdown => {
    const rawScores = {
      operational: 0,
      licensing: 0,
      feedback: 0,
      certifications: 0,
      digital: 0,
    };
  
    // 1. Calculate Raw Points per Category
    
    // Operational & Professional Standards
    if (answers.hasLicense) rawScores.operational += 10;
    if (answers.hasLiabilityInsurance) rawScores.operational += 5;
    if (answers.hasWorkersComp) rawScores.operational += 5;
    rawScores.operational = Math.min(RAW_MAX.operational, rawScores.operational);
  
    // Licensing & Compliance
    const years = Math.max(0, Math.min(answers.yearsLicensed, RAW_MAX.licensing)); // 0–10

    if (years === 0) {
      rawScores.licensing = 0;
    } else if (years <= 2) {
      rawScores.licensing = 4; // just started but licensed
    } else if (years <= 5) {
      rawScores.licensing = 7; // established
    } else {
      rawScores.licensing = 10; // 6+ years = full points
    }
    
    // Customer Feedback & Online Authority
    // If they have no rating AND no reviews, treat feedback as 0.
    if (answers.googleRating <= 0 && answers.googleReviews <= 0) {
      rawScores.feedback = 0;
    } else {
      const baseRating = Math.max(4.0, answers.googleRating);
      const ratingPoints = 5 + (baseRating - 4.0) * 10; // 4.0→5, 4.5→10, 5.0→15

      let reviewPoints = 0;
      if (answers.googleReviews >= 40)      reviewPoints = 15;
      else if (answers.googleReviews >= 20) reviewPoints = 10;
      else if (answers.googleReviews >= 5)  reviewPoints = 6;
      else if (answers.googleReviews > 0)   reviewPoints = 4;

      rawScores.feedback = Math.min(RAW_MAX.feedback, ratingPoints + reviewPoints);
    }
    
    // Industry Certifications & Training
    let certCount = 0;
    if (answers.certifications.water) certCount++;
    if (answers.certifications.fire)  certCount++;
    if (answers.certifications.mold)  certCount++;
    if (answers.certifications.other) certCount++;

    // Each certification adds 5 points, matching the UI label.
    rawScores.certifications = certCount * 5;
    rawScores.certifications = Math.min(RAW_MAX.certifications, rawScores.certifications);

    // Digital & Brand Maturity
    if (answers.hasWebsite)        rawScores.digital += 7;
    if (answers.hasProEmail)       rawScores.digital += 5;
    if (answers.emergencyLine)     rawScores.digital += 3;
    if (answers.activeSocialMedia) rawScores.digital += 1;
    if (answers.brandedVehicles)   rawScores.digital += 1;
    rawScores.digital = Math.min(RAW_MAX.digital, rawScores.digital);

    // 2. Use raw total directly as 0–100 score
    const rawTotal =
      rawScores.operational +
      rawScores.licensing +
      rawScores.feedback +
      rawScores.certifications +
      rawScores.digital;
      
    const clampedTotal = Math.min(100, Math.max(0, Math.round(rawTotal)));

    const grade = getGrade(clampedTotal);
    const scoresForEligibility = {
        ...rawScores,
        total: clampedTotal,
    };
    const { isEligible, eligibilityReasons } = evaluateEligibility(answers, scoresForEligibility);
    const opportunities = getOpportunities(answers);

    return {
      operational: rawScores.operational,
      licensing: rawScores.licensing,
      feedback: rawScores.feedback,
      certifications: rawScores.certifications,
      digital: rawScores.digital,
      total: clampedTotal,
      grade,
      isEligibleForCertification: isEligible,
      eligibilityReasons,
      opportunities,
    };
};

const ScoreWidget: React.FC<{ score: number, breakdown: Omit<ScoreBreakdown, 'total' | 'grade' | 'isEligibleForCertification' | 'eligibilityReasons' | 'opportunities'>, isPopup?: boolean }> = ({ score, breakdown, isPopup }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const prevScoreRef = useRef(score);

    React.useEffect(() => {
        const previousScore = prevScoreRef.current;
        if (previousScore === score) {
            return;
        }
        let animationFrameId: number;
        const duration = 500;
        const startTimestamp = performance.now();

        const step = (timestamp: number) => {
            const elapsedTime = timestamp - startTimestamp;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            const newDisplayScore = Math.round(previousScore + (score - previousScore) * easedProgress);
            setDisplayScore(newDisplayScore);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [score]);
    
    React.useEffect(() => {
        prevScoreRef.current = score;
    }, [score]);
    
    const getScoreColor = (s: number) => {
        if (s < 45) return 'bg-error';
        if (s < 60) return 'bg-warning';
        if (s < 75) return 'bg-brand-accent';
        return 'bg-success';
    };

    const breakdownItems = [
        { label: 'Operational', value: breakdown.operational, max: 20 },
        { label: 'Licensing', value: breakdown.licensing, max: 10 },
        { label: 'Feedback', value: breakdown.feedback, max: 30 },
        { label: 'Certifications', value: breakdown.certifications, max: 20 },
        { label: 'Digital', value: breakdown.digital, max: 17 },
    ];

    return (
        <div className={`p-4 bg-white rounded-xl shadow-lg border border-gray-border ${!isPopup ? 'sticky top-0 md:top-8 md:w-64 md:ml-8 lg:ml-16 z-10' : ''}`}>
            <h3 className="font-sora text-charcoal text-lg font-bold text-center mb-2">Your Score</h3>
            <div className="flex justify-center items-baseline gap-1 mb-4">
                <span className="font-sora text-6xl font-bold text-charcoal">{displayScore}</span>
                <span className="font-sora text-2xl font-semibold text-gray-400">/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                    className={`h-4 rounded-full transition-all duration-500 ${getScoreColor(score)}`} 
                    style={{ width: `${score}%` }}
                ></div>
            </div>
            <p className="text-center text-sm text-gray mt-2">{isPopup ? 'Based on your current inputs.' : 'Updating in real-time...'}</p>
            {isPopup && (
                <div className="mt-6 pt-4 border-t border-gray-border space-y-2">
                    <h4 className="font-bold text-center mb-2">Breakdown</h4>
                    {breakdownItems.map(item => (
                        <div key={item.label} className="text-sm">
                            <div className="flex justify-between font-medium"><span>{item.label}</span><span>{item.value} / {item.max}</span></div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div className="bg-brand-accent h-1.5 rounded-full" style={{ width: `${(item.value/item.max) * 100}%`}}></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface CheckboxProps {
    label: string;
    points: number;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
    feedbackMessage?: string;
}

const PointCheckbox: React.FC<CheckboxProps> = ({ label, points, checked, onChange, description, feedbackMessage }) => {
    const [showFlash, setShowFlash] = useState(false);
    
    const handleChange = (isChecked: boolean) => {
        if(isChecked){
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 700);
        }
        onChange(isChecked);
    };
    
    return (
    <div>
      <label className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-5 border border-gray-border rounded-xl cursor-pointer hover:border-brand-accent-dark transition-colors duration-200 min-h-36 gap-3 sm:gap-0">
        <div className="flex-1 mr-0 sm:mr-4">
          <span className="font-semibold text-charcoal text-base md:text-lg leading-tight">{label}</span>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto space-x-4 flex-shrink-0 relative">
          <span className="font-sora font-bold text-brand-accent text-lg">+{points} pts</span>
          <div className="relative">
            <input 
              type="checkbox" 
              checked={checked} 
              onChange={e => handleChange(e.target.checked)} 
              className="sr-only" 
            />
            <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-accent' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} style={{top: '2px', position: 'relative'}}></div>
            </div>
          </div>
           {showFlash && (
              <div className="absolute -top-8 -right-2 font-bold text-xl text-brand-accent animate-point-flash pointer-events-none">
                +{points} ✨
              </div>
            )}
        </div>
      </label>
      {checked && feedbackMessage && (
        <div className="pl-4 mt-2 text-sm text-green-700 flex items-center gap-2 animate-fade-in">
            <CheckCircleIcon className="w-5 h-5" />
            <span>{feedbackMessage}</span>
        </div>
      )}
    </div>
    );
};

const LiveScoreIndicator: React.FC<{ score: number }> = ({ score }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const prevScoreRef = useRef(score);

    React.useEffect(() => {
        const previousScore = prevScoreRef.current;
        if (previousScore === score) {
            return;
        }
        let animationFrameId: number;
        const duration = 400;
        const startTimestamp = performance.now();

        const step = (timestamp: number) => {
            const elapsedTime = timestamp - startTimestamp;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            const newDisplayScore = Math.round(previousScore + (score - previousScore) * easedProgress);
            setDisplayScore(newDisplayScore);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [score]);
    
    React.useEffect(() => {
        prevScoreRef.current = score;
    }, [score]);


    const getScoreColor = (s: number) => {
        if (s < 45) return 'bg-error';
        if (s < 60) return 'bg-warning';
        if (s < 75) return 'bg-brand-accent';
        return 'bg-success';
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-baseline w-14 justify-end">
                <span className="font-sora font-bold text-sm text-charcoal">{displayScore}</span>
                <span className="font-sora text-xs text-gray-500">/100</span>
            </div>
            <div className="w-20 bg-gray-200 rounded-full h-2 relative">
                <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getScoreColor(score)}`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
        </div>
    );
};

const MobileBottomBar: React.FC<{
  step: number;
  score: number;
  onScoreClick: () => void;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
}> = ({ step, score, onScoreClick, onBack, onNext, canProceed }) => {
    const progress = ((step + 1) / ASSESSMENT_STEPS.length) * 100;
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-border z-20 md:hidden">
            <div onClick={onScoreClick} className="px-4 pt-2 pb-1.5 cursor-pointer">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-gray-dark">Step {step + 1} of {ASSESSMENT_STEPS.length}</span>
                    <LiveScoreIndicator score={score} />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-brand-accent h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-center text-xs font-bold text-gray-dark mt-1.5">{ASSESSMENT_STEPS[step]}</p>
            </div>
            <div className="p-4 flex justify-between items-center gap-4 bg-white/50">
                 <button 
                    onClick={onBack} 
                    className="py-3 px-6 bg-white text-charcoal font-semibold rounded-lg shadow-md border border-gray-border hover:bg-gray-100"
                >
                    Back
                </button>
                <button 
                    onClick={onNext}
                    disabled={!canProceed}
                    className={`flex-grow py-3 px-8 font-bold text-lg rounded-lg shadow-lg ${
                      canProceed 
                        ? 'bg-brand-accent text-charcoal hover:bg-brand-accent-dark' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {step === ASSESSMENT_STEPS.length - 1 ? 'Finish' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

const LiveScorePopup: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    score: number;
    breakdown: Omit<ScoreBreakdown, 'total' | 'grade' | 'isEligibleForCertification' | 'eligibilityReasons' | 'opportunities'>;
}> = ({ isOpen, onClose, score, breakdown }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-40" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 animate-fade-in"></div>
            <div className="absolute bottom-0 left-0 right-0 animate-slide-up-drawer p-4" onClick={e => e.stopPropagation()}>
                <ScoreWidget score={score} breakdown={breakdown} isPopup={true} />
            </div>
        </div>
    );
};


const AssessmentTool: React.FC<{ onComplete: (result: ScoreBreakdown & { answers: Answers }) => void }> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [assessmentInputs, setAssessmentInputs] = useState<AssessmentInputs>({
    full_name_entered: '',
    email_entered: '',
    state: '',
    city: ''
  });
  const [isScorePopupOpen, setIsScorePopupOpen] = useState(false);
  const [animationClass, setAnimationClass] = useState('animate-fade-in');
  const [contentKey, setContentKey] = useState(0);
  
  // Email eligibility state
  const [emailEligibilityState, setEmailEligibilityState] = useState<{
    checking: boolean;
    eligible: boolean | null;
    reason: string | null;
    message: string | null;
    showingMagicLinkForm: boolean;
    magicLinkSent: boolean;
    magicLinkError: string | null;
  }>({
    checking: false,
    eligible: null,
    reason: null,
    message: null,
    showingMagicLinkForm: false,
    magicLinkSent: false,
    magicLinkError: null,
  });

  // Check email eligibility
  const checkEmailEligibility = async (email: string) => {
    if (!isValidEmail(email)) return;

    setEmailEligibilityState(prev => ({ ...prev, checking: true, eligible: null, reason: null, message: null }));

    try {
      const response = await fetch('/.netlify/functions/check-email-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const result = await response.json();

      if (response.ok) {
        setEmailEligibilityState(prev => ({
          ...prev,
          checking: false,
          eligible: result.eligible,
          reason: result.reason || null,
          message: result.message || null,
        }));

        // If not eligible and is existing member, show magic link option
        if (!result.eligible && result.reason === 'member') {
          setEmailEligibilityState(prev => ({ ...prev, showingMagicLinkForm: true }));
        }
      } else {
        console.error('Email eligibility check failed:', result);
        setEmailEligibilityState(prev => ({
          ...prev,
          checking: false,
          eligible: true, // Allow to proceed on API error
          reason: null,
          message: null,
        }));
      }
    } catch (error) {
      console.error('Error checking email eligibility:', error);
      setEmailEligibilityState(prev => ({
        ...prev,
        checking: false,
        eligible: true, // Allow to proceed on network error
        reason: null,
        message: null,
      }));
    }
  };

  // Send magic link to existing member
  const sendMagicLink = async () => {
    const email = assessmentInputs.email_entered.trim().toLowerCase();
    
    setEmailEligibilityState(prev => ({ ...prev, magicLinkError: null }));

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: `${window.location.origin}/dashboard`,
          shouldCreateUser: false 
        },
      });

      if (error) {
        setEmailEligibilityState(prev => ({ 
          ...prev, 
          magicLinkError: error.message || 'Failed to send magic link' 
        }));
      } else {
        setEmailEligibilityState(prev => ({ ...prev, magicLinkSent: true }));
      }
    } catch (error) {
      setEmailEligibilityState(prev => ({ 
        ...prev, 
        magicLinkError: 'Network error. Please try again.' 
      }));
    }
  };

  const scoreData = useMemo(() => calculateScore(answers), [answers]);

  const handleNext = () => {
    if (!canProceed()) {
      return;
    }

    if (step < ASSESSMENT_STEPS.length - 1) {
        setAnimationClass('animate-slide-out-left');
        setTimeout(() => {
            setStep(prevStep => prevStep + 1);
            setContentKey(prevKey => prevKey + 1);
            setAnimationClass('animate-slide-in-from-right');
        }, 300);
    } else {
        const result = { 
          ...scoreData, 
          answers,
          emailEntered: assessmentInputs.email_entered,
          fullNameEntered: assessmentInputs.full_name_entered,
          state: assessmentInputs.state,
          cityEntered: assessmentInputs.city
        };
        
        // Save assessment data to Supabase
        saveAssessmentData(result);
        
        onComplete(result);
    }
  };

  const handleBack = () => {
    if (step > 0) {
        setAnimationClass('animate-slide-out-right');
        setTimeout(() => {
            setStep(prevStep => prevStep - 1);
            setContentKey(prevKey => prevKey + 1);
            setAnimationClass('animate-slide-in-from-left');
        }, 300);
    } else {
        navigate('/');
    }
  };

  const updateAnswer = <K extends keyof Answers,>(key: K, value: Answers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const updateAssessmentInput = <K extends keyof AssessmentInputs,>(key: K, value: AssessmentInputs[K]) => {
    setAssessmentInputs(prev => ({ ...prev, [key]: value }));
  };

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if current step can proceed
  const canProceed = () => {
    if (step === 0) {
      // Business Basics step - require new fields and email eligibility
      const basicFieldsValid = assessmentInputs.full_name_entered.trim() !== '' &&
             assessmentInputs.email_entered.trim() !== '' &&
             isValidEmail(assessmentInputs.email_entered.trim()) &&
             assessmentInputs.state !== '' &&
             assessmentInputs.city.trim() !== '';
      
      // Also check email eligibility - don't allow proceeding if ineligible
      const emailEligible = emailEligibilityState.eligible !== false;
      
      return basicFieldsValid && emailEligible && !emailEligibilityState.checking;
    }
    return true;
  };

  // Helper function to convert to integer
  const toInt = (value: any): number => {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : Math.round(value);
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : Math.round(parsed);
    }
    return 0;
  };

  // Save assessment data to Supabase
  const saveAssessmentData = async (assessmentData: any) => {
    try {
      // Normalize payload to match database schema exactly
      const normalizedPayload = {
        email_entered: assessmentInputs.email_entered.trim().toLowerCase(),
        full_name_entered: assessmentInputs.full_name_entered.trim(),
        state: assessmentInputs.state,
        city: assessmentInputs.city.trim(),
        answers: assessmentData.answers, // This should be valid JSONB
        // Ensure all score fields are integers and match DB columns exactly
        operational_score: toInt(assessmentData.operational),
        licensing_score: toInt(assessmentData.licensing),
        feedback_score: toInt(assessmentData.feedback),
        certifications_score: toInt(assessmentData.certifications), // NOT "certifications"
        digital_score: toInt(assessmentData.digital),
        total_score: toInt(assessmentData.total),
        scenario: assessmentData.scenario || null,
        // Optional fields if they exist in the result
        ...(assessmentData.grade && { pci_rating: assessmentData.grade }),
        ...(assessmentData.isEligibleForCertification !== undefined && { 
          scenario: assessmentData.isEligibleForCertification ? 'eligible' : 'not_eligible' 
        })
      };

      console.log('Saving assessment with normalized payload:', {
        keys: Object.keys(normalizedPayload),
        types: Object.entries(normalizedPayload).reduce((acc, [key, value]) => {
          acc[key] = typeof value;
          return acc;
        }, {} as Record<string, string>)
      });

      // Use insert instead of upsert since we don't have an existing ID
      const { data, error } = await supabase
        .from('assessments')
        .insert(normalizedPayload)
        .select()
        .single();

      if (error) {
        console.error('Error saving assessment data:', error);
        console.error('Payload that failed:', normalizedPayload);
        console.log('Assessment save failed due to error. Continuing without persistence.');
        return null;
      }

      console.log('Assessment data saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to save assessment:', error);
      console.log('Assessment save failed. Continuing without persistence.');
      return null;
    }
  };

  const updateNestedAnswer = <K extends 'services' | 'certifications' | 'otherPlatforms', NK extends keyof Answers[K]>(key: K, nestedKey: NK, value: Answers[K][NK]) => {
      setAnswers(prev => ({
          ...prev,
          [key]: {
              ...prev[key],
              [nestedKey]: value
          }
      }));
  };
    
  const renderStep = () => {
    const feedbackMessage = "Nice — this is one of the core signals top-tier restoration firms have in place.";

    switch (step) {
        case 0: // Business Basics
            return (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray">Full Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={assessmentInputs.full_name_entered} 
                          onChange={e => updateAssessmentInput('full_name_entered', e.target.value)} 
                          className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"
                          placeholder="Enter your full name"
                          required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray">Business Email <span className="text-red-500">*</span></label>
                        <input 
                          type="email" 
                          value={assessmentInputs.email_entered} 
                          onChange={e => {
                            const newEmail = e.target.value;
                            updateAssessmentInput('email_entered', newEmail);
                            
                            // Reset eligibility state when email changes
                            setEmailEligibilityState(prev => ({
                              ...prev,
                              eligible: null,
                              reason: null,
                              message: null,
                              showingMagicLinkForm: false,
                              magicLinkSent: false,
                              magicLinkError: null,
                            }));
                          }}
                          onBlur={() => {
                            if (assessmentInputs.email_entered.trim()) {
                              checkEmailEligibility(assessmentInputs.email_entered.trim());
                            }
                          }}
                          className={`mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)] ${
                            assessmentInputs.email_entered && !isValidEmail(assessmentInputs.email_entered) ? 'border-red-500' : 
                            emailEligibilityState.eligible === false ? 'border-red-500' :
                            emailEligibilityState.eligible === true ? 'border-green-500' :
                            'border-gray-border'
                          }`}
                          placeholder="Enter your business email"
                          required
                        />
                        
                        {/* Email validation error */}
                        {assessmentInputs.email_entered && !isValidEmail(assessmentInputs.email_entered) && (
                          <p className="mt-1 text-sm text-red-500">Please enter a valid email address</p>
                        )}
                        
                        {/* Email eligibility checking */}
                        {emailEligibilityState.checking && (
                          <div className="mt-2 flex items-center text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-accent mr-2"></div>
                            Checking email eligibility...
                          </div>
                        )}
                        
                        {/* Email eligibility results */}
                        {emailEligibilityState.eligible === false && emailEligibilityState.reason === 'member' && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium mb-2">
                              {emailEligibilityState.message || "This email is already a member."}
                            </p>
                            {!emailEligibilityState.showingMagicLinkForm ? (
                              <button
                                type="button"
                                onClick={() => setEmailEligibilityState(prev => ({ ...prev, showingMagicLinkForm: true }))}
                                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Send Magic Link to Access Your Account
                              </button>
                            ) : emailEligibilityState.magicLinkSent ? (
                              <div className="text-sm text-green-700">
                                ✅ Magic link sent! Check your inbox and click the link to access your Member Hub.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-blue-700">
                                  We'll send you a magic link to access your Member Hub.
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={sendMagicLink}
                                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Send Magic Link
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEmailEligibilityState(prev => ({ ...prev, showingMagicLinkForm: false }))}
                                    className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {emailEligibilityState.magicLinkError && (
                                  <p className="text-sm text-red-600">{emailEligibilityState.magicLinkError}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {emailEligibilityState.eligible === false && emailEligibilityState.reason === 'recent-assessment' && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              {emailEligibilityState.message || "You've recently completed an assessment. Please check your inbox or contact support."}
                            </p>
                          </div>
                        )}
                        
                        {emailEligibilityState.eligible === true && (
                          <div className="mt-2 flex items-center text-sm text-green-600">
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Email is eligible for assessment
                          </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray">State <span className="text-red-500">*</span></label>
                            <select 
                              value={assessmentInputs.state} 
                              onChange={e => updateAssessmentInput('state', e.target.value)} 
                              className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"
                              required
                            >
                                <option value="">Select State</option>
                                {US_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray">City <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              value={assessmentInputs.city} 
                              onChange={e => updateAssessmentInput('city', e.target.value)} 
                              className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"
                              placeholder="Enter your city"
                              required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray">Business Name</label>
                        <input type="text" value={answers.businessName} onChange={e => updateAnswer('businessName', e.target.value)} className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray">What city do you primarily serve?</label>
                        <input type="text" value={answers.city} onChange={e => updateAnswer('city', e.target.value)} className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray">How long have you been in business?</label>
                        <select value={answers.yearsInBusiness} onChange={e => updateAnswer('yearsInBusiness', parseInt(e.target.value))} className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]">
                            {[1,2,3,4,5,10,15,20].map(y => <option key={y} value={y}>{y}{y === 20 ? '+' : ''} years</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray">Briefly describe your business (optional)</label>
                        <textarea 
                            value={answers.businessDescription} 
                            onChange={e => updateAnswer('businessDescription', e.target.value)} 
                            rows={3}
                            className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"
                            placeholder="E.g., We are a family-owned restoration company specializing in 24/7 water and fire damage cleanup..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray">What services do you offer?</label>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                            {(Object.keys(answers.services) as Array<keyof Answers['services']>).map(service => (
                                <label key={service} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                                    <input type="checkbox" checked={answers.services[service]} onChange={e => updateNestedAnswer('services', service, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-accent focus:ring-brand-accent"/>
                                    <span className="capitalize">{service}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 1: // Operational & Professional Standards
            return (
                <div className="space-y-4">
                    <PointCheckbox 
                        label="Active contractor license?" 
                        points={10} 
                        checked={answers.hasLicense} 
                        onChange={c => updateAnswer('hasLicense', c)}
                        description="Adjusters, carriers, and commercial clients often require this before sending work."
                        feedbackMessage={feedbackMessage}
                    />
                    <PointCheckbox 
                        label="General liability insurance $1M+?" 
                        points={5} 
                        checked={answers.hasLiabilityInsurance} 
                        onChange={c => updateAnswer('hasLiabilityInsurance', c)}
                        description="Protects you and your clients if something goes wrong on a job."
                        feedbackMessage={feedbackMessage}
                    />
                    <PointCheckbox 
                        label="Workers' comp insurance?" 
                        points={5} 
                        checked={answers.hasWorkersComp} 
                        onChange={c => updateAnswer('hasWorkersComp', c)}
                        description="Shows you’re taking care of your team and operating legitimately."
                    />
                </div>
            );
        case 2: // Licensing & Compliance
            return (
                <div>
                    <label className="block text-sm font-medium text-gray mb-2">How many years have you been licensed?</label>
                    <input type="range" min="0" max="20" value={answers.yearsLicensed} onChange={e => updateAnswer('yearsLicensed', parseInt(e.target.value))} className="w-full custom-slider" style={{'--value-percent': `${(answers.yearsLicensed / 20) * 100}%`} as React.CSSProperties}/>
                    <div className="text-center font-sora font-bold text-2xl text-charcoal mt-2">{answers.yearsLicensed} years</div>
                    <p className="text-center text-sm text-gray mt-2">1–2 years = 4 pts • 3–5 years = 7 pts • 6+ years = 10 pts</p>
                </div>
            );
        case 3: // Customer Feedback & Online Authority
            return (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray">What's your Google Business Profile rating?</label>
                        <select value={answers.googleRating} onChange={e => updateAnswer('googleRating', parseFloat(e.target.value))} className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]">
                            <option value={0}>No rating yet</option>
                            {Array.from({length: 11}, (_, i) => 4.0 + i * 0.1).map(r => <option key={r} value={r.toFixed(1)}>{r.toFixed(1)} stars</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray">How many Google reviews do you have?</label>
                        <input type="number" value={answers.googleReviews} onChange={e => updateAnswer('googleReviews', parseInt(e.target.value) || 0)} className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-brand-accent focus:border-brand-accent bg-[var(--bg-input)] text-[var(--text-main)]"/>
                    </div>
                </div>
            );
        case 4: // Industry Certifications & Training
            return (
                <div className="space-y-4">
                    <PointCheckbox label="IICRC: Water Damage Restoration" points={5} checked={answers.certifications.water} onChange={c => updateNestedAnswer('certifications', 'water', c)} />
                    <PointCheckbox label="IICRC: Fire & Smoke Restoration" points={5} checked={answers.certifications.fire} onChange={c => updateNestedAnswer('certifications', 'fire', c)} />
                    <PointCheckbox label="IICRC: Mold Remediation" points={5} checked={answers.certifications.mold} onChange={c => updateNestedAnswer('certifications', 'mold', c)} />
                    <PointCheckbox label="Other industry certifications" points={5} checked={answers.certifications.other} onChange={c => updateNestedAnswer('certifications', 'other', c)} />
                </div>
            );
        case 5: // Digital & Brand Maturity
            return (
                <div className="space-y-4">
                    <PointCheckbox 
                        label="Professional website with your own domain?" 
                        points={7} 
                        checked={answers.hasWebsite} 
                        onChange={c => updateAnswer('hasWebsite', c)}
                        description="Most homeowners will judge your professionalism in the first 10 seconds on your site."
                        feedbackMessage={feedbackMessage}
                    />
                    <PointCheckbox 
                        label="Professional email with your own domain?" 
                        points={5} 
                        checked={answers.hasProEmail} 
                        onChange={c => updateAnswer('hasProEmail', c)}
                        description="For example: info@yourcompany.com. Shows you're an established business, not a temporary operation."
                    />
                    <PointCheckbox 
                        label="24/7 emergency phone line?" 
                        points={3} 
                        checked={answers.emergencyLine} 
                        onChange={c => updateAnswer('emergencyLine', c)}
                        description="Water and fire losses don’t wait for business hours. Don’t send panicked homeowners to voicemail."
                    />
                    <PointCheckbox 
                        label="Active on social media?" 
                        points={1} 
                        checked={answers.activeSocialMedia} 
                        onChange={c => updateAnswer('activeSocialMedia', c)}
                        description="A simple way to show recent work and connect with your community."
                    />
                    <PointCheckbox 
                        label="Branded vehicles/uniforms?" 
                        points={1} 
                        checked={answers.brandedVehicles} 
                        onChange={c => updateAnswer('brandedVehicles', c)}
                        description="Turns your work trucks into mobile billboards, building brand recognition."
                    />
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="font-inter bg-gray-light min-h-screen p-4 md:p-8 pb-40 md:pb-8">
        <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center animate-fade-in" style={{ animationDuration: '0.6s' }}>
                <img 
                    src="https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertise_logo_s.webp" 
                    alt="Restoration Expertise Logo" 
                    className="mx-auto mb-4 w-full max-w-[140px] md:max-w-[180px]"
                />
                 <h1 className="font-sora text-3xl md:text-4xl font-bold text-charcoal">Credibility Assessment</h1>
            </div>

            {/* Desktop Progress Bar */}
            <div className="mb-8 hidden md:block">
                <div className="flex justify-between mb-2">
                    {ASSESSMENT_STEPS.map((s, i) => (
                        <div key={s} className="text-center w-1/6">
                             <div className={`text-xs md:text-sm font-semibold ${step >= i ? 'text-brand-accent-dark' : 'text-gray-400'}`}>{s}</div>
                        </div>
                    ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-brand-accent h-2.5 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / ASSESSMENT_STEPS.length) * 100}%` }}></div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:mt-0">
                <div className="w-full md:flex-1 bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="font-sora text-2xl font-bold text-charcoal mb-1">Step {step + 1}: {ASSESSMENT_STEPS[step]}</h2>
                            <p className="text-gray">Complete this section to see your score update.</p>
                        </div>
                    </div>
                    <div className={`mt-8 ${animationClass}`} key={contentKey}>
                        {renderStep()}
                    </div>
                </div>
                <div className="hidden md:block mt-6 md:mt-0 md:w-64">
                    <ScoreWidget score={scoreData.total} breakdown={scoreData} />
                </div>
            </div>

            {/* Desktop Navigation */}
            <div className="mt-8 hidden md:flex justify-between items-center">
                 <button 
                    onClick={handleBack} 
                    className="py-3 px-6 bg-white text-charcoal font-semibold rounded-lg shadow-md border border-gray-border hover:bg-gray-100 transition-colors"
                >
                    Back
                </button>
                <button 
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`py-3 px-8 font-bold text-lg rounded-lg shadow-lg transition-transform transform ${
                      canProceed() 
                        ? 'bg-brand-accent text-charcoal hover:bg-brand-accent-dark hover:scale-105' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {step === ASSESSMENT_STEPS.length - 1 ? 'Finish & See Results' : 'Continue'}
                </button>
            </div>
            {/* Mobile Bottom Bar & Popups */}
            <div className="md:hidden">
                <MobileBottomBar
                    step={step}
                    score={scoreData.total}
                    onScoreClick={() => setIsScorePopupOpen(true)}
                    onBack={handleBack}
                    onNext={handleNext}
                    canProceed={canProceed()}
                />
                <LiveScorePopup
                    isOpen={isScorePopupOpen}
                    onClose={() => setIsScorePopupOpen(false)}
                    score={scoreData.total}
                    breakdown={scoreData}
                />
            </div>
        </div>
    </div>
  );
};

export default AssessmentTool;