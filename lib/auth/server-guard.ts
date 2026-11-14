import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isAuthorizedAdminIdentity } from './admin-config';
import { Profile } from '@/lib/types/database';

/**
 * Creates an elevated Supabase client with the service role key.
 * STRICTLY SERVER-SIDE - NEVER EXPOSE TO CLIENT.
 */
export function createAdminServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || url.includes('your-project-id') || serviceKey.includes('your-service-role-key-here')) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AdminVerificationResult {
  authorized: boolean;
  statusCode?: number;
  reason?: string;
  user?: any;
  profile?: Profile | null;
}

/**
 * Validates that the current request has an active, authenticated administrator session.
 * Checks both database role and server-configured admin identity.
 */
export async function verifyAdminSession(): Promise<AdminVerificationResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    // Supabase credentials not yet configured: in local offline mode
    return {
      authorized: false,
      statusCode: 503,
      reason: 'Configuration Supabase absente du serveur.',
    };
  }

  // Use getUser() to securely validate session with Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      statusCode: 401,
      reason: 'Non authentifié. Veuillez vous connecter.',
    };
  }

  // Fetch profile to verify role and status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Profil utilisateur introuvable ou corrompu.',
    };
  }

  // Check account active status
  if (profile.is_active === false || profile.status === 'suspended' || profile.status === 'revoked') {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Votre compte a été désactivé par l\'administration.',
    };
  }

  // Check role in database
  if (profile.role !== 'admin') {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Accès refusé. Privilèges administrateur requis.',
    };
  }

  // Cross-check identity with server-configured authorized admin
  if (!isAuthorizedAdminIdentity(user)) {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Compte non autorisé pour l\'administration de cette cohorte.',
    };
  }

  return {
    authorized: true,
    user,
    profile,
  };
}

/**
 * Validates that the current request has an active authenticated student session.
 */
export async function verifyStudentSession() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      authenticated: false,
      statusCode: 503,
      reason: 'Configuration Supabase absente.',
    };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authenticated: false,
      statusCode: 401,
      reason: 'Non authentifié.',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && (profile.is_active === false || profile.status === 'suspended')) {
    return {
      authenticated: false,
      statusCode: 403,
      reason: 'Compte suspendu.',
      profile,
    };
  }

  return {
    authenticated: true,
    user,
    profile: profile || null,
  };
}
