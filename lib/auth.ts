// TODO: Replace with Supabase Auth
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'mock_session';
const SESSION_VALUE = 'authenticated';

export interface Session {
  userId: string;
  email: string;
}

// Server-side session check
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    if (sessionCookie?.value === SESSION_VALUE) {
      return { userId: 'demo-user', email: 'demo@docfill.app' };
    }
    return null;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionCookieValue(): string {
  return SESSION_VALUE;
}
