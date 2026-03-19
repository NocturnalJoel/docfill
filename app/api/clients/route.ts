import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getClients, createClient } from '@/lib/store';
import { Client } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clients = getClients();
    return NextResponse.json({ clients });
  } catch (err) {
    console.error('Get clients error:', err);
    return NextResponse.json({ error: 'Failed to get clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const client: Client = {
      id: uuidv4(),
      name: name.trim(),
      email: email?.trim() || undefined,
      company: company?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const created = createClient(client);
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
