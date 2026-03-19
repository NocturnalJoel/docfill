import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Template } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const template: Template = {
      id: data.id,
      name: data.name,
      fileName: data.file_name,
      fileType: data.file_type,
      fileUrl: `/api/files/${data.id}`,
      uploadedAt: data.uploaded_at,
      fields: data.fields ?? [],
      pageCount: data.page_count ?? 0,
    };

    return NextResponse.json({ template });
  } catch (err) {
    console.error('Get template error:', err);
    return NextResponse.json({ error: 'Failed to get template' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const admin = createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.fields !== undefined) updateData.fields = body.fields;
    if (body.pageCount !== undefined) updateData.page_count = body.pageCount;

    const { data, error } = await admin
      .from('templates')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const template: Template = {
      id: data.id,
      name: data.name,
      fileName: data.file_name,
      fileType: data.file_type,
      fileUrl: `/api/files/${data.id}`,
      uploadedAt: data.uploaded_at,
      fields: data.fields ?? [],
      pageCount: data.page_count ?? 0,
    };

    return NextResponse.json({ template });
  } catch (err) {
    console.error('Update template error:', err);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Get the record first to find the storage path
    const { data: row } = await admin
      .from('templates')
      .select('file_url, file_type')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!row) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    // Delete from Storage
    const filesToDelete = [row.file_url];
    if (row.file_type === 'word') {
      filesToDelete.push(`${user.id}/${params.id}.html`);
    }
    await admin.storage.from('uploads').remove(filesToDelete);

    const { error } = await admin
      .from('templates')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
