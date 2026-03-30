import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Template } from '@/lib/types';
import { DEV_USER_ID, isDevRequest } from '@/lib/dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let userId: string;
    if (isDevRequest(request)) {
      userId = DEV_USER_ID;
    } else {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = user.id;
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
    }

    const templates: Template[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      fileName: row.file_name,
      fileType: row.file_type,
      fileUrl: `/api/files/${row.id}`,
      uploadedAt: row.uploaded_at,
      fields: row.fields ?? [],
      pageCount: row.page_count ?? 0,
    }));

    return NextResponse.json({ templates });
  } catch (err) {
    console.error('Get templates error:', err);
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
  }
}
