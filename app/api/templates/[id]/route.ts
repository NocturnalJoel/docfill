import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, updateTemplate, deleteTemplate, deleteUploadedFile } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = getTemplate(params.id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
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
    const body = await request.json();
    const updated = updateTemplate(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ template: updated });
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
    const template = getTemplate(params.id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    deleteUploadedFile(params.id);
    const deleted = deleteTemplate(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
