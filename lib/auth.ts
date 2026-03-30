import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { DEV_USER_ID, DEV_EMAIL } from '@/lib/dev';

export interface Session {
  userId: string;
  email: string;
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('dev_bypass')?.value === '1') {
      return { userId: DEV_USER_ID, email: DEV_EMAIL };
    }
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { userId: user.id, email: user.email ?? '' };
  } catch {
    return null;
  }
}
