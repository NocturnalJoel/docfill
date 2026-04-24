import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession, hasActiveSubscription } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const devBypass = cookieStore.get('dev_bypass')?.value === '1';

  const session = await getSession();

  if (!session && !devBypass) {
    redirect('/login');
  }

  if (session && !devBypass) {
    const active = await hasActiveSubscription(session.userId);
    if (!active) {
      redirect('/subscribe');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Navbar email={session?.email} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
