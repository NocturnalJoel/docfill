import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, updateTemplate } from '@/lib/store';
import { TemplateField } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fields, pageCount } = body as { fields: TemplateField[]; pageCount?: number };

    const template = getTemplate(params.id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updates: { fields: TemplateField[]; pageCount?: number } = { fields };
    if (pageCount !== undefined) updates.pageCount = pageCount;

    const updated = updateTemplate(params.id, updates);
    return NextResponse.json({ template: updated });
  } catch (err) {
    console.error('Update template fields error:', err);
    return NextResponse.json({ error: 'Failed to update fields' }, { status: 500 });
  }
}
