import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import MemberDashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/AdminLoginPage';
import AssessmentTool from './components/AssessmentTool';
import ResultsPage from './components/ResultsPage';
import SuccessPage from './components/SuccessPage';
import { ThemeProvider } from './components/ThemeContext';
import { supabase } from '@/lib/supabase';
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
    result: ScoreBreakdown & { answers: Answers },
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

    let emailEntered: string | null =
      session?.user?.email ?? currentUser?.email ?? null;

    if (!session) {
      emailEntered = emailEntered?.trim() || null;
      if (!emailEntered) {
        const promptValue = window
          .prompt('Where should we send your assessment results?')
          ?.trim();

        if (!promptValue) {
          alert('Please enter an email address to receive your results.');
          return;
        }

        emailEntered = promptValue;
      }
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

    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          user_id: session?.user?.id ?? null,
          profile_id: profile?.id ?? null,
          email_entered: emailEntered,
          answers: result.answers,
          total_score: result.total,
          operational_score: result.operational,
          licensing_score: result.licensing,
          feedback_score: result.feedback,
          certifications_score: result.certifications,
          digital_score: result.digital,
          scenario,
          pci_rating: result.grade,
          intended_membership_tier: intendedMembershipTier,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      type SupabaseAssessmentRow = {
        id?: number | string;
        created_at?: string;
        user_id?: string | null;
        profile_id?: string | null;
        email_entered?: string | null;
        answers?: Answers;
        total_score?: number;
        operational_score?: number;
        licensing_score?: number;
        feedback_score?: number;
        certifications_score?: number;
        digital_score?: number;
        scenario?: string | null;
        pci_rating?: string | null;
        intended_membership_tier?: string | null;
      };

      const row = data as SupabaseAssessmentRow;

      if (profile?.id && row.id != null) {
        try {
          await updateProfileWithAssessment(profile.id, row.id, result.total);
        } catch (profileUpdateError) {
          console.error('Failed to update profile with assessment', profileUpdateError);
          alert('We saved your assessment but could not update your profile.');
        }

        if (result.isEligibleForCertification && intendedMembershipTier) {
          try {
            await createPendingMembership(
              profile.id,
              intendedMembershipTier,
              row.id,
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
        answers: (row.answers as Answers) ?? result.answers,
        operational: row.operational_score ?? result.operational,
        licensing: row.licensing_score ?? result.licensing,
        feedback: row.feedback_score ?? result.feedback,
        certifications: row.certifications_score ?? result.certifications,
        digital: row.digital_score ?? result.digital,
        total: row.total_score ?? result.total,
        grade:
          (row.pci_rating as ScoreBreakdown['grade']) ?? result.grade,
        isEligibleForCertification: row.scenario
          ? row.scenario === 'eligible'
          : result.isEligibleForCertification,
        scenario: row.scenario ?? scenario,
        pciRating: row.pci_rating ?? result.grade,
        intendedMembershipTier:
          row.intended_membership_tier ?? intendedMembershipTier,
        id: row.id,
        createdAt: row.created_at,
        userId: row.user_id ?? session?.user?.id ?? null,
        emailEntered: row.email_entered ?? emailEntered,
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
