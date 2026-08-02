import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, LogOut, ChevronLeft } from 'lucide-react';
import GlobalSearch from './GlobalSearch';

type NavbarProps = {
  onLogout?: () => void;
  rightContent?: React.ReactNode;
  onSearchNavigate?: (student: { group_id: string | null }) => void;
};

export default function Navbar({ onLogout, rightContent, onSearchNavigate }: NavbarProps) {
  const { settings } = useSettings();
  const { role, assistant, isMaster } = useAuth();

  return (
    <nav className="glass border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo + platform name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt="لوجو الخالد"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover ring-2 ring-emerald-500/40 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center ring-2 ring-emerald-500/40 flex-shrink-0">
              <GraduationCap className="text-emerald-400" size={20} />
            </div>
          )}
          <div className="min-w-0 hidden md:block">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {settings.platform_name}
            </h1>
            <p className="text-[10px] sm:text-xs text-emerald-400/80 truncate hidden xs:block">
              {settings.management_name}
            </p>
          </div>
        </div>

        {/* Center: Global search */}
        <div className="flex-1 flex justify-center max-w-md">
          <GlobalSearch onNavigate={onSearchNavigate} />
        </div>

        {/* Right side: teacher badge + actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Teacher/assistant badge */}
          {isMaster ? (
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-teal-500/15 border border-teal-500/30 text-teal-400 rounded-lg text-xs font-bold flex-shrink-0">
              <GraduationCap size={14} />
              <span className="hidden sm:inline">المدرس 🎓</span>
              <span className="sm:hidden">🎓</span>
            </span>
          ) : assistant ? (
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold flex-shrink-0">
              <span className="hidden sm:inline">{assistant.display_name ?? assistant.username}</span>
              <span className="sm:hidden">مساعد</span>
            </span>
          ) : null}

          {rightContent}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs sm:text-sm text-slate-400 hover:text-red-400 transition px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
