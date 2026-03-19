import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';

// TODO: Replace with Supabase Auth session check
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Navbar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
