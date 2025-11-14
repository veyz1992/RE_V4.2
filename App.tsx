import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import MemberDashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/AdminLoginPage';
import AssessmentTool from './components/AssessmentTool';
import ResultsPage from './components/ResultsPage';
import SuccessPage from './components/SuccessPage';
import AuthCallback from './components/AuthCallback';
import { ThemeProvider } from './components/ThemeContext';
import { supabase } from '@/lib/supabase';
import { FUNCTION_ENDPOINTS } from '@/lib/functions';
import { useAuth } from '@/context/AuthContext';
import type { Answers, ScoreBreakdown, StoredAssessmentResult } from './types';

const LoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] text-[var(--text-muted)]">
    <span className="animate-pulse text-lg">Connecting to Supabase...</span>
  </div>
);

const LoginRoute: React.FC = () => {
  const { session, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Navigate to={isAdmin ? '/admin' : '/member/dashboard'} replace />;
  }

  return <LoginPage />;
};

const MemberRoute: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <MemberDashboard />;
};

const AdminRoute: React.FC = () => {
  const { session, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminDashboard />;
};

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const { session, currentUser } = useAuth();
  const [assessmentResult, setAssessmentResult] = useState<StoredAssessmentResult | null>(null);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);

  const determineMembershipTier = (
    grade: ScoreBreakdown['grade'],
    isEligible: boolean,
  ) => {
    if (isEligible) {
      return 'Founding Member';
    }

    switch (grade) {
      case 'A+':
      case 'A':
        return 'Gold';
      case 'B+':
        return 'Silver';
      default:
        return 'Bronze';
    }
  };

  type ProfileRow = {
    id: string;
    last_assessment_id?: number | string | null;
    last_pci_score?: number | null;
  };

  const getOrCreateProfile = async (userId: string) => {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, last_assessment_id, last_pci_score')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingProfile) {
      return existingProfile as ProfileRow;
    }

    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select('id, last_assessment_id, last_pci_score')
      .single();

    if (insertError) {
      throw insertError;
    }

    return createdProfile as ProfileRow;
  };

  const updateProfileWithAssessment = async (
    profileId: string,
    assessmentId: number | string,
    pciScore: number,
  ) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        last_assessment_id: assessmentId,
        last_pci_score: pciScore,
      })
      .eq('id', profileId);

    if (error) {
      throw error;
    }
  };

  const createPendingMembership = async (
    profileId: string,
    tier: string,
    assessmentId: number | string,
  ) => {
    const { error } = await supabase.from('memberships').insert({
      profile_id: profileId,
      tier,
      status: 'pending',
      verification_status: 'pending',
      badge_rating: null,
      assessment_id: assessmentId,
    });

    if (error) {
      throw error;
    }
  };

  const handleAssessmentComplete = async (
    result: ScoreBreakdown & { answers: Answers; emailEntered?: string; fullNameEntered?: string; state?: string; cityEntered?: string },
  ) => {
    if (isSavingAssessment) {
      return;
    }

    const scenario = result.isEligibleForCertification
      ? 'eligible'
      : 'not_eligible';
    const intendedMembershipTier = determineMembershipTier(
      result.grade,
      result.isEligibleForCertification,
    );

    // Normalize and avoid mixing ?? with || without parentheses
    const typed = result.emailEntered?.trim();
    const normalized = typed && typed.length > 0 ? typed : undefined;

    const emailEntered: string | null =
      normalized
      ?? session?.user?.email
      ?? currentUser?.email
      ?? null;

    if (!emailEntered) {
      console.error('No email available from assessment or session - this should not happen');
      return;
    }

    setIsSavingAssessment(true);

    let profile: ProfileRow | null = null;

    if (session?.user?.id) {
      try {
        profile = await getOrCreateProfile(session.user.id);
      } catch (profileError) {
        console.error('Failed to load or create profile', profileError);
        alert(
          'We will continue with your assessment, but updating your profile may not be complete.',
        );
      }
    }

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

    try {
      const normalizedPayload = {
        email: emailEntered,
        answers: result.answers,
        total_score: toInt(result.total),
        operational_score: toInt(result.operational),
        licensing_score: toInt(result.licensing),
        feedback_score: toInt(result.feedback),
        certifications_score: toInt(result.certifications),
        digital_score: toInt(result.digital),
        scenario,
        intended_membership_tier: intendedMembershipTier,
        full_name: result.fullNameEntered?.trim() || null,
        city: result.cityEntered?.trim() || null,
        state: result.state?.trim() || null,
        user_id: session?.user?.id ?? null,
        profile_id: profile?.id ?? null,
        assessment_id: result.assessmentId ?? result.id ?? null,
      };

      console.log('Saving assessment via function (App.tsx):', {
        keys: Object.keys(normalizedPayload),
      });

      let saveResponse: Response;
      try {
        saveResponse = await fetch(FUNCTION_ENDPOINTS.SAVE_ASSESSMENT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedPayload),
        });
      } catch (networkError) {
        console.error('save-assessment network error:', networkError);
        throw networkError;
      }

      const responseText = await saveResponse.text();
      let parsedSave: any = {};

      try {
        parsedSave = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse save-assessment response:', {
          responseText,
          parseError,
        });
      }

      if (!saveResponse.ok || !parsedSave?.success) {
        console.error('save-assessment failed:', {
          status: saveResponse.status,
          responseText,
        });
        throw new Error(parsedSave?.error ?? 'ASSESSMENT_SAVE_FAILED');
      }

      const assessmentId = parsedSave?.assessment_id ?? null;
      const profileIdFromResponse = parsedSave?.profile_id ?? profile?.id ?? null;

      if (profile?.id && assessmentId != null) {
        try {
          await updateProfileWithAssessment(profile.id, assessmentId, toInt(result.total));
        } catch (profileUpdateError) {
          console.error('Failed to update profile with assessment', profileUpdateError);
          alert('We saved your assessment but could not update your profile.');
        }

        if (result.isEligibleForCertification && intendedMembershipTier) {
          try {
            await createPendingMembership(
              profile.id,
              intendedMembershipTier,
              assessmentId,
            );
          } catch (membershipError) {
            console.error('Failed to create pending membership', membershipError);
            alert(
              'We saved your assessment but could not update your membership status.',
            );
          }
        }
      }

      const storedResult: StoredAssessmentResult = {
        ...result,
        operational: toInt(result.operational),
        licensing: toInt(result.licensing),
        feedback: toInt(result.feedback),
        certifications: toInt(result.certifications),
        digital: toInt(result.digital),
        total: toInt(result.total),
        scenario,
        pciRating: result.grade,
        intendedMembershipTier,
        id: assessmentId ?? result.id,
        assessmentId: assessmentId ?? result.assessmentId ?? result.id ?? null,
        profileId: profileIdFromResponse,
        createdAt: result.createdAt,
        userId: session?.user?.id ?? null,
        emailEntered,
        fullNameEntered: result.fullNameEntered,
        state: result.state,
        cityEntered: result.cityEntered,
      };

      setAssessmentResult(storedResult);
      navigate('/results');
    } catch (err) {
      console.error('Failed to save assessment result', err);
      alert('We had trouble saving your assessment. Please try again.');
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleRetakeAssessment = () => {
    setAssessmentResult(null);
    navigate('/assessment');
  };

  const handleJoin = () => {
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/" element={<LoginRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/assessment"
        element={<AssessmentTool onComplete={handleAssessmentComplete} />}
      />
      <Route
        path="/results"
        element={
          assessmentResult ? (
            <ResultsPage
              result={assessmentResult}
              onRetake={handleRetakeAssessment}
              onJoin={handleJoin}
            />
          ) : (
            <Navigate to="/assessment" replace />
          )
        }
      />
      <Route path="/success/:plan" element={<SuccessPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/member/dashboard" element={<MemberRoute />} />
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppRoutes />
  </ThemeProvider>
);

export default App;
