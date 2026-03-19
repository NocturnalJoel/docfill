import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Client } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const client: Client = {
      id: data.id,
      name: data.name,
      email: data.email ?? undefined,
      company: data.company ?? undefined,
      createdAt: data.created_at,
    };

    return NextResponse.json({ client });
  } catch (err) {
    console.error('Get client error:', err);
    return NextResponse.json({ error: 'Failed to get client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const admin = createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.company !== undefined) updateData.company = body.company || null;

    const { data, error } = await admin
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const client: Client = {
      id: data.id,
      name: data.name,
      email: data.email ?? undefined,
      company: data.company ?? undefined,
      createdAt: data.created_at,
    };

    return NextResponse.json({ client });
  } catch (err) {
    console.error('Update client error:', err);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const { data: docs } = await admin
      .from('client_documents')
      .select('id, file_url, file_type')
      .eq('client_id', id)
      .eq('user_id', user.id);

    if (docs && docs.length > 0) {
      const filesToDelete: string[] = [];
      for (const doc of docs) {
        filesToDelete.push(doc.file_url);
        if (doc.file_type === 'word') filesToDelete.push(`${user.id}/${doc.id}.html`);
      }
      await admin.storage.from('uploads').remove(filesToDelete);
    }

    const { error } = await admin
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
