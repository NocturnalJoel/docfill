import { createClient } from '@/lib/supabase/server';

export interface Session {
  userId: string;
  email: string;
}

export async function getSession(): Promise<Session | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { userId: user.id, email: user.email ?? '' };
  } catch {
    return null;
  }
}
