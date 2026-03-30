import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DetectedField } from '@/lib/types';
import { isDevRequest } from '@/lib/dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fields, pageCount } = body as { fields: DetectedField[]; pageCount?: number };

    if (isDevRequest(request)) {
      const store = await import('@/lib/store');
      const updates: Record<string, unknown> = { fields };
      if (pageCount !== undefined) updates.pageCount = pageCount;
      const document = store.updateDocument(id, updates as Parameters<typeof store.updateDocument>[1]);
      if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      return NextResponse.json({ document });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const updateData: Record<string, unknown> = { fields };
    if (pageCount !== undefined) updateData.page_count = pageCount;

    const { data, error } = await admin
      .from('client_documents')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const document = {
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
    console.error('Update document fields error:', err);
    return NextResponse.json({ error: 'Failed to update fields' }, { status: 500 });
  }
}
