import { NextRequest, NextResponse } from 'next/server';
import { createAdminServiceClient } from '@/lib/auth/server-guard';
import { CohortService } from '@/lib/services/cohort-service';
import { Profile } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'ID utilisateur et email requis pour la synchronisation.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = (fullName || cleanEmail.split('@')[0]).trim();
    const nowIso = new Date().toISOString();

    const newProfile: Profile = {
      id: userId,
      email: cleanEmail,
      full_name: cleanFullName,
      role: 'student', // Strictly enforce student role
      cohort_id: 'c0a80101-0000-4000-8000-000000000001',
      is_active: true,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Try syncing via elevated Server Service Client if available
    const serviceClient = createAdminServiceClient();
    if (serviceClient) {
      // Find default cohort id
      let cohortId = 'c0a80101-0000-4000-8000-000000000001';
      try {
        const { data: cohortData } = await serviceClient
          .from('cohorts')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (cohortData?.id) {
          cohortId = cohortData.id;
          newProfile.cohort_id = cohortId;
        }
      } catch {
        // Fallback to default cohort ID
      }

      // Upsert profile in Supabase public.profiles
      const { error: upsertError } = await serviceClient
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: cleanEmail,
            full_name: cleanFullName,
            role: 'student', // Never trust client-submitted role
            cohort_id: cohortId,
            is_active: true,
            status: 'active',
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (upsertError) {
        console.warn('Sync profile Supabase error:', upsertError);
      }

      // Ensure cohort_members record
      try {
        await serviceClient
          .from('cohort_members')
          .upsert(
            {
              cohort_id: cohortId,
              user_id: userId,
              role: 'student',
            },
            { onConflict: 'cohort_id,user_id' }
          );
      } catch {
        // Ignore membership duplicate
      }
    }

    // 2. Also register in CohortService local store for persistence & immediate Admin visibility
    CohortService.saveRegisteredProfile(newProfile);

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (err: any) {
    console.error('Error in /api/auth/sync-profile:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur interne de synchronisation' },
      { status: 500 }
    );
  }
}
