import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, createAdminServiceClient } from '@/lib/auth/server-guard';
import { getAuthorizedAdminEmail } from '@/lib/auth/admin-config';
import { CohortService } from '@/lib/services/cohort-service';
import { Profile } from '@/lib/types/database';

export async function GET() {
  const adminCheck = await verifyAdminSession();

  // If local offline development mode without Supabase keys:
  if (!adminCheck.authorized && adminCheck.statusCode === 503) {
    const registeredStudents = CohortService.getRegisteredStudents();
    const adminEmail = getAuthorizedAdminEmail();
    const adminProfile: Profile = {
      id: 'admin-authorized-01',
      email: adminEmail,
      full_name: 'Délégué de Promotion (Admin)',
      role: 'admin',
      cohort_id: 'c0a80101-0000-4000-8000-000000000001',
      is_active: true,
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json({ users: [adminProfile, ...registeredStudents] });
  }

  if (!adminCheck.authorized) {
    return NextResponse.json(
      { error: adminCheck.reason || 'Accès non autorisé' },
      { status: adminCheck.statusCode || 403 }
    );
  }

  const serviceClient = createAdminServiceClient();
  if (!serviceClient) {
    // If authenticated in demo/offline session
    const registeredStudents = CohortService.getRegisteredStudents();
    const adminEmail = getAuthorizedAdminEmail();
    const adminProfile: Profile = {
      id: adminCheck.user?.id || 'admin-authorized-01',
      email: adminCheck.user?.email || adminEmail,
      full_name: adminCheck.profile?.full_name || 'Délégué de Promotion (Admin)',
      role: 'admin',
      cohort_id: 'c0a80101-0000-4000-8000-000000000001',
      is_active: true,
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json({ users: [adminProfile, ...registeredStudents] });
  }

  try {
    // 1. Fetch all existing profiles in public.profiles
    const { data: existingProfiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        cohort_id,
        is_active,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.warn('Profiles query error:', profilesError.message);
    }

    let profilesList = existingProfiles || [];

    // 2. Cross-reference with Supabase Auth users to auto-sync any missing profile
    try {
      const { data: authData } = await serviceClient.auth.admin.listUsers();
      if (authData?.users && authData.users.length > 0) {
        const existingIds = new Set(profilesList.map((p) => p.id));
        const missingAuthUsers = authData.users.filter((u) => !existingIds.has(u.id));

        if (missingAuthUsers.length > 0) {
          const authorizedAdminEmail = getAuthorizedAdminEmail();
          for (const u of missingAuthUsers) {
            const uEmail = u.email?.trim().toLowerCase() || '';
            const uName = (u.user_metadata?.full_name || uEmail.split('@')[0] || 'Étudiant').trim();
            const uRole = uEmail === authorizedAdminEmail ? 'admin' : 'student';

            await serviceClient.from('profiles').upsert(
              {
                id: u.id,
                email: uEmail,
                full_name: uName,
                role: uRole,
                cohort_id: 'c0a80101-0000-4000-8000-000000000001',
                is_active: true,
                status: 'active',
                created_at: u.created_at,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
          }

          // Refetch updated list
          const { data: refreshed } = await serviceClient
            .from('profiles')
            .select(`
              id,
              email,
              full_name,
              role,
              cohort_id,
              is_active,
              status,
              created_at,
              updated_at
            `)
            .order('created_at', { ascending: false });

          if (refreshed) {
            profilesList = refreshed;
          }
        }
      }
    } catch (authSyncErr) {
      console.warn('Auth admin listUsers sync notice:', authSyncErr);
    }

    // 3. Merge in any local session registered students not yet replicated
    const localStudents = CohortService.getRegisteredStudents();
    if (localStudents.length > 0) {
      const dbIds = new Set(profilesList.map((p) => p.id));
      const dbEmails = new Set(profilesList.map((p) => p.email.toLowerCase()));
      for (const ls of localStudents) {
        if (!dbIds.has(ls.id) && !dbEmails.has(ls.email.toLowerCase())) {
          profilesList.push({
            id: ls.id,
            email: ls.email,
            full_name: ls.full_name,
            role: ls.role,
            cohort_id: ls.cohort_id,
            is_active: ls.is_active ?? true,
            status: ls.status ?? 'active',
            created_at: ls.created_at || new Date().toISOString(),
            updated_at: ls.updated_at || new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ users: profilesList });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await verifyAdminSession();
  if (!adminCheck.authorized) {
    return NextResponse.json(
      { error: adminCheck.reason || 'Accès non autorisé' },
      { status: adminCheck.statusCode || 403 }
    );
  }

  const serviceClient = createAdminServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Clé de service Supabase manquante sur le serveur' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { userId, status, isActive } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 400 });
    }

    // Safety: prevent admin from disabling their own account
    if (userId === adminCheck.user?.id) {
      return NextResponse.json(
        { error: 'Impossible de désactiver ou révoquer le compte administrateur principal.' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
    }
    if (status && ['active', 'suspended', 'revoked'].includes(status)) {
      updates.status = status;
      if (status !== 'active') {
        updates.is_active = false;
      }
    }

    const { data: updatedProfile, error } = await serviceClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 });
  }
}
