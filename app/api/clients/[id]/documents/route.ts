import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClientDocument } from '@/lib/types';
import { DEV_USER_ID, isDevRequest } from '@/lib/dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let userId: string;
    if (isDevRequest(request)) {
      userId = DEV_USER_ID;
    } else {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = user.id;
    }

    if (isDevRequest(request)) {
      const store = await import('@/lib/store');
      const documents = store.getClientDocuments(id);
      return NextResponse.json({ documents });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('client_documents')
      .select('*')
      .eq('client_id', id)
      .eq('user_id', userId)
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
