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
      .eq('client_id', id)
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 });

    const documents: ClientDocument[] = (data ?? []).map((row) => ({
      id: row.id,
      clientId: row.client_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileUrl: `/api/files/${row.id}`,
      uploadedAt: row.uploaded_at,
      fields: row.fields ?? [],
      pageCount: row.page_count ?? 0,
    }));

    return NextResponse.json({ documents });
  } catch (err) {
    console.error('Get client documents error:', err);
    return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 });
  }
}
