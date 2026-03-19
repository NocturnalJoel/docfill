import { NextRequest, NextResponse } from 'next/server';
import { getClient, updateClient, deleteClient } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient(params.id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ client });
  } catch (err) {
    console.error('Get client error:', err);
    return NextResponse.json({ error: 'Failed to get client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = updateClient(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ client: updated });
  } catch (err) {
    console.error('Update client error:', err);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = deleteClient(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
