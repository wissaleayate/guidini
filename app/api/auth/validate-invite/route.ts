import { NextRequest, NextResponse } from 'next/server';
import { createAdminServiceClient } from '@/lib/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawCode = body?.inviteCode;

    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return NextResponse.json(
        { error: 'Code d\'invitation requis.' },
        { status: 400 }
      );
    }

    const cleanCode = rawCode.trim().toUpperCase();
    const serviceClient = createAdminServiceClient();

    if (!serviceClient) {
      // In offline/unconfigured mode, accept standard code for testing
      if (cleanCode === 'MED-2026-ALG') {
        return NextResponse.json({
          valid: true,
          cohortId: 'c0a80101-0000-4000-8000-000000000001',
          cohortName: 'Faculté de Médecine - Constantine',
        });
      }
      return NextResponse.json(
        { error: 'Code d\'invitation non reconnu.' },
        { status: 400 }
      );
    }

    // 1. Check in cohort_invites table
    const { data: invite, error: inviteErr } = await serviceClient
      .from('cohort_invites')
      .select('id, cohort_id, is_active, expires_at, max_uses, uses_count')
      .ilike('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle();

    if (invite && !inviteErr) {
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Ce code d\'invitation a expiré.' },
          { status: 400 }
        );
      }

      if (invite.max_uses && (invite.uses_count || 0) >= invite.max_uses) {
        return NextResponse.json(
          { error: 'Ce code d\'invitation a atteint son nombre maximal d\'utilisations.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        valid: true,
        cohortId: invite.cohort_id,
        inviteId: invite.id,
      });
    }

    // 2. Check fallback in cohorts table invite_code
    const { data: cohort, error: cohortErr } = await serviceClient
      .from('cohorts')
      .select('id, name, invite_code')
      .ilike('invite_code', cleanCode)
      .maybeSingle();

    if (cohort && !cohortErr) {
      return NextResponse.json({
        valid: true,
        cohortId: cohort.id,
        cohortName: cohort.name,
      });
    }

    return NextResponse.json(
      { error: 'Code d\'invitation invalide ou non reconnu.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Validate invite error:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de la validation du code' },
      { status: 500 }
    );
  }
}
