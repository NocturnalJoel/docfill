'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, FileText, Zap, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText },
  { href: '/dashboard/generate', label: 'Generate', icon: Zap },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'mock_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/');
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">DocFill</span>
        </div>
        <p className="text-white/40 text-xs mt-1">Document automation</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                active
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-white/60 hover:bg-sidebar-hover hover:text-white'
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold">
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm font-medium truncate">Demo User</p>
            <p className="text-white/40 text-xs truncate">demo@docfill.app</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-sidebar-hover transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
