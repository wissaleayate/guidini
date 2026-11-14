'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, Profile } from '@/lib/types/database';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CohortService } from '@/lib/services/cohort-service';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  actualRole: UserRole;
  isLoading: boolean;
  isConfigured: boolean;
  switchRole: (newRole: UserRole) => void;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, fullName: string, inviteCode?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_ADMIN_PROFILE: Profile = {
  id: 'admin-user-001',
  email: 'admin.med@univ.dz',
  full_name: 'Délégué de Promotion (Admin)',
  role: 'admin',
  cohort_id: 'c0a80101-0000-4000-8000-000000000001',
  is_active: true,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_STUDENT_PROFILE: Profile = {
  id: 'demo-student-id',
  email: 'etudiant.med@univ.dz',
  full_name: 'Étudiant en Médecine',
  role: 'student',
  cohort_id: 'c0a80101-0000-4000-8000-000000000001',
  is_active: true,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function translateAuthError(message?: string): string {
  if (!message) return 'Une erreur est survenue lors de l\'authentification.';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Identifiants incorrects (email ou mot de passe invalide).';
  }
  if (lower.includes('email not confirmed')) {
    return 'Veuillez confirmer votre adresse email via le lien reçu avant de vous connecter.';
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'Un compte existe déjà avec cette adresse email. Veuillez vous connecter.';
  }
  if (lower.includes('at least 6 characters')) {
    return 'Le mot de passe doit comporter au moins 6 caractères.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Trop de tentatives infructueuses. Veuillez patienter un instant.';
  }
  return message;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'student',
  actualRole: 'student',
  isLoading: true,
  isConfigured: false,
  switchRole: () => {},
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
  updatePassword: async () => ({ success: false }),
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [actualRole, setActualRole] = useState<UserRole>('student');
  const [role, setRole] = useState<UserRole>('student');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const fetchUserProfile = async (userId: string, userEmail?: string, userMeta?: any) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        // If account is suspended or revoked
        if (data.is_active === false || data.status === 'suspended' || data.status === 'revoked') {
          await supabase.auth.signOut();
          setUser(null);
          setActualRole('student');
          setRole('student');
          return;
        }

        setUser(data);
        setActualRole(data.role);
        setRole(data.role);
      } else {
        const fallback: Profile = {
          id: userId,
          email: userEmail || '',
          full_name: userMeta?.full_name || 'Membre Cohorte',
          role: 'student',
          cohort_id: null,
          is_active: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(fallback);
        setActualRole('student');
        setRole('student');
      }
    } catch (err) {
      console.warn('Erreur de chargement du profil utilisateur:', err);
    }
  };

  const refreshProfile = async () => {
    if (!isConfigured || !user?.id) return;
    const supabase = createClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email, session.user.user_metadata);
      }
    }
  };

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (configured) {
      const supabase = createClient();
      if (supabase) {
        // Check current session from Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            fetchUserProfile(session.user.id, session.user.email, session.user.user_metadata).finally(() => {
              setIsLoading(false);
            });
          } else {
            setUser(null);
            setIsLoading(false);
          }
        });

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session?.user) {
              await fetchUserProfile(session.user.id, session.user.email, session.user.user_metadata);
            } else {
              setUser(null);
              setActualRole('student');
              setRole('student');
            }
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    } else {
      // In local demo mode, initialize with demo student profile
      setUser(DEFAULT_STUDENT_PROFILE);
      setActualRole('student');
      setRole('student');
      setIsLoading(false);
    }
  }, []);

  const switchRole = (newRole: UserRole) => {
    // Only real admins are allowed to preview the student view or switch back to admin view!
    if (actualRole !== 'admin') {
      console.warn("Privilège refusé: seul un administrateur peut basculer d'affichage.");
      return;
    }
    setRole(newRole);
  };

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!isConfigured) {
      // Local simulation
      if (email.toLowerCase().includes('admin')) {
        setUser(DEFAULT_ADMIN_PROFILE);
        setActualRole('admin');
        setRole('admin');
      } else {
        const student = {
          ...DEFAULT_STUDENT_PROFILE,
          email,
          full_name: email.split('@')[0],
        };
        setUser(student);
        setActualRole('student');
        setRole('student');
      }
      return { success: true };
    }

    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase client non disponible' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      return { success: false, error: translateAuthError(error.message) };
    }

    if (data.user) {
      await fetchUserProfile(data.user.id, data.user.email, data.user.user_metadata);
    }

    return { success: true };
  };

  const signUp = async (
    email: string,
    pass: string,
    fullName: string,
    inviteCode?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!isConfigured) {
      const newProfile: Profile = {
        id: `stu-${Date.now()}`,
        email,
        full_name: fullName,
        role: 'student',
        cohort_id: 'c0a80101-0000-4000-8000-000000000001',
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(newProfile);
      setActualRole('student');
      setRole('student');
      return { success: true };
    }

    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase client non disponible' };

    const cleanInvite = inviteCode?.trim().toUpperCase();

    // Client ALWAYS requests 'student'; database trigger also strictly enforces 'student'
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          full_name: fullName.trim(),
          role: 'student',
          invite_code: cleanInvite,
        },
      },
    });

    if (error) {
      return { success: false, error: translateAuthError(error.message) };
    }

    if (data.user) {
      if (data.session) {
        if (cleanInvite) {
          try {
            await CohortService.joinCohortWithCode(cleanInvite, data.user.id);
          } catch {
            // Ignore join error if handled by trigger
          }
        }
        await fetchUserProfile(data.user.id, data.user.email, data.user.user_metadata);
        return { success: true };
      } else {
        return {
          success: true,
          message: 'Votre compte étudiant a été créé. Si la confirmation d\'email est requise, veuillez consulter votre boîte de réception.',
        };
      }
    }

    return { success: true };
  };

  const signOut = async () => {
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    setUser(null);
    setActualRole('student');
    setRole('student');
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { success: true };
    }
    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase non configuré' };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/reset-password`,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const updatePassword = async (newPassword: string) => {
    if (!isConfigured) {
      return { success: true };
    }
    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase non configuré' };

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        actualRole,
        isLoading,
        isConfigured,
        switchRole,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
