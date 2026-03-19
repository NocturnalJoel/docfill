import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClientDocument } from '@/lib/types';

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
      .from('client_documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const document: ClientDocument = {
      id: data.id,
      clientId: data.client_id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileUrl: `/api/files/${data.id}`,
      uploadedAt: data.uploaded_at,
      fields: data.fields ?? [],
      pageCount: data.page_count ?? 0,
    };

    return NextResponse.json({ document });
  } catch (err) {
    console.error('Get document error:', err);
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 });
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

    const { data: row } = await admin
      .from('client_documents')
      .select('file_url, file_type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!row) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const filesToDelete = [row.file_url];
    if (row.file_type === 'word') filesToDelete.push(`${user.id}/${id}.html`);
    await admin.storage.from('uploads').remove(filesToDelete);

    const { error } = await admin
      .from('client_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete document error:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
