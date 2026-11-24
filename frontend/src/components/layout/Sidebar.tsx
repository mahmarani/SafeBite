import {
  GitCompareArrows,
  HeartPulse,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  ScanLine,
  Settings,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { NavItemConfig, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../../data/navigation';
import { BrandMark } from '../common/BrandMark';

const ICON_MAP = {
  LayoutDashboard,
  ScanLine,
  History,
  GitCompareArrows,
  HeartPulse,
  Settings,
  LifeBuoy,
};

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarNavItem({
  item,
  onNavigate,
}: {
  item: NavItemConfig;
  onNavigate: () => void;
}) {
  const Icon = ICON_MAP[item.iconName];

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[14px] font-medium transition-colors duration-150 whitespace-nowrap ${
          isActive
            ? 'bg-[#E9F7EF] text-[#135530] font-semibold border border-[#BDE5CE]/70'
            : 'text-[#5C534A] border border-transparent hover:bg-[#FAF7F2] hover:text-[#1F1A17]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1D7A46]' : 'text-[#8A7F74]'}`}
            strokeWidth={isActive ? 2 : 1.6}
          />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onCloseMobile();
    showToast({
      type: 'info',
      title: 'Signed out',
      description: 'Your local NutriLens session has ended.',
    });
    navigate('/login');
  };

  const initials = (user?.fullName || 'NL')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E8E1D5]">
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#E8E1D5] shrink-0">
        <NavLink to="/dashboard" onClick={onCloseMobile} className="focus:outline-none">
          <BrandMark />
        </NavLink>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-[8px] text-[#6A6057] hover:text-[#1F1A17] hover:bg-[#F3EDE2] cursor-pointer"
        >
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 flex flex-col justify-between gap-6">
        <nav aria-label="Primary navigation" className="space-y-1">
          <p className="px-3 mb-2 font-data text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8A7F74]">
            Workspace
          </p>
          {PRIMARY_NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.path} item={item} onNavigate={onCloseMobile} />
          ))}

          <div className="pt-5 mt-5 border-t border-[#EFE9DF]">
            <p className="px-3 mb-2 font-data text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8A7F74]">
              Account
            </p>
            <div className="space-y-1">
              {SECONDARY_NAV_ITEMS.map((item) => (
                <SidebarNavItem key={item.path} item={item} onNavigate={onCloseMobile} />
              ))}
            </div>
          </div>
        </nav>

        <div className="pt-4 border-t border-[#EFE9DF]">
          <div className="px-2.5 py-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1F1A17] flex items-center justify-center text-[12px] font-bold text-[#FAF7F2] shrink-0 font-data">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1F1A17] truncate">
                {user?.fullName || 'Demo User'}
              </p>
              <p className="text-[12px] text-[#6A6057] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#5C534A] hover:bg-[#FDECEC] hover:text-[#9B1F1B] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.6} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[256px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#1F1A17]/35 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-[272px] max-w-[82vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
