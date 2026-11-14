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
    return NextResponse.json(
      { error: 'Clé de service Supabase manquante sur le serveur' },
      { status: 500 }
    );
  }

  try {
    const { data: profiles, error } = await serviceClient
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: profiles || [] });
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

    return NextResponse.json({
      success: true,
      message: 'Statut du compte étudiant mis à jour avec succès.',
      profile: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 });
  }
}
