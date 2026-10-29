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
  refreshProfile: () => Promise<void>;
}

const DEFAULT_ADMIN_PROFILE: Profile = {
  id: 'admin-user-001',
  email: 'admin.med@univ.dz',
  full_name: 'Délégué de Promotion (Admin)',
  role: 'admin',
  cohort_id: 'c0a80101-0000-4000-8000-000000000001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_STUDENT_PROFILE: Profile = {
  id: 'demo-student-id',
  email: 'etudiant.med@univ.dz',
  full_name: 'Étudiant en Médecine',
  role: 'student',
  cohort_id: 'c0a80101-0000-4000-8000-000000000001',
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
  user: DEFAULT_STUDENT_PROFILE,
  role: 'student',
  actualRole: 'student',
  isLoading: false,
  isConfigured: false,
  switchRole: () => {},
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(DEFAULT_STUDENT_PROFILE);
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
            setIsLoading(false);
          }
        });

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session?.user) {
              await fetchUserProfile(session.user.id, session.user.email, session.user.user_metadata);
            } else {
              setUser(DEFAULT_STUDENT_PROFILE);
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
      // In local demo mode, default to student, ready immediately
      setIsLoading(false);
    }
  }, []);

  const switchRole = (newRole: UserRole) => {
    // If live Supabase is configured:
    // Only real admins are allowed to preview the student view or switch back to admin view!
    if (isConfigured) {
      if (actualRole !== 'admin' && newRole === 'admin') {
        console.warn("Privilège refusé: seul un administrateur peut basculer d'affichage.");
        return;
      }
      setRole(newRole);
      return;
    }

    // In demo mode without Supabase: freely switch between mock accounts
    setRole(newRole);
    setActualRole(newRole);
    if (newRole === 'admin') {
      setUser(DEFAULT_ADMIN_PROFILE);
    } else {
      setUser(DEFAULT_STUDENT_PROFILE);
    }
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

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          full_name: fullName.trim(),
          role: 'student', // Client requests student; trigger strictly enforces 'student'
          invite_code: cleanInvite,
        },
      },
    });

    if (error) {
      return { success: false, error: translateAuthError(error.message) };
    }

    if (data.user) {
      // If session exists immediately (email confirmation disabled in Supabase)
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
        // Confirmation email required by Supabase settings
        return {
          success: true,
          message: 'Votre compte a été créé. Si la confirmation d\'email est activée dans votre projet Supabase, veuillez vérifier votre boîte de réception.',
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
    setUser(DEFAULT_STUDENT_PROFILE);
    setActualRole('student');
    setRole('student');
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
