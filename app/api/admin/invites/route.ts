import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, createAdminServiceClient } from '@/lib/auth/server-guard';

export async function GET() {
  const adminCheck = await verifyAdminSession();
  if (!adminCheck.authorized) {
    return NextResponse.json(
      { error: adminCheck.reason || 'Accès non autorisé' },
      { status: adminCheck.statusCode || 403 }
    );
  }

  const serviceClient = createAdminServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Supabase non configuré sur le serveur' }, { status: 500 });
  }

  try {
    const { data: invites, error } = await serviceClient
      .from('cohort_invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invites: invites || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminSession();
  if (!adminCheck.authorized) {
    return NextResponse.json(
      { error: adminCheck.reason || 'Accès non autorisé' },
      { status: adminCheck.statusCode || 403 }
    );
  }

  const serviceClient = createAdminServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Supabase non configuré sur le serveur' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { code, maxUses, expiresAt, cohortId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code d\'invitation manquant' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Default to the cohort id if not provided
    let targetCohortId = cohortId;
    if (!targetCohortId) {
      const { data: defaultCohort } = await serviceClient
        .from('cohorts')
        .select('id')
        .limit(1)
        .single();
      targetCohortId = defaultCohort?.id;
    }

    if (!targetCohortId) {
      return NextResponse.json({ error: 'Cohorte introuvable pour rattacher le code' }, { status: 400 });
    }

    const { data: newInvite, error } = await serviceClient
      .from('cohort_invites')
      .insert({
        cohort_id: targetCohortId,
        code: cleanCode,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        expires_at: expiresAt || null,
        is_active: true,
        created_by: adminCheck.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ce code d\'invitation existe déjà.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Code d\'invitation créé avec succès.',
      invite: newInvite,
    });
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
    return NextResponse.json({ error: 'Supabase non configuré sur le serveur' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { inviteId, isActive } = body;

    if (!inviteId) {
      return NextResponse.json({ error: 'ID d\'invitation manquant' }, { status: 400 });
    }

    const { data: updatedInvite, error } = await serviceClient
      .from('cohort_invites')
      .update({ is_active: Boolean(isActive) })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Statut du code d\'invitation mis à jour.',
      invite: updatedInvite,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 });
  }
}
