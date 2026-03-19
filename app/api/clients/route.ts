import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Client } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to get clients' }, { status: 500 });

    const clients: Client[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email ?? undefined,
      company: row.company ?? undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ clients });
  } catch (err) {
    console.error('Get clients error:', err);
    return NextResponse.json({ error: 'Failed to get clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, email, company } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('clients')
      .insert({
        id: uuidv4(),
        user_id: user.id,
        name: name.trim(),
        email: email?.trim() || null,
        company: company?.trim() || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });

    const client: Client = {
      id: data.id,
      name: data.name,
      email: data.email ?? undefined,
      company: data.company ?? undefined,
      createdAt: data.created_at,
    };

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
