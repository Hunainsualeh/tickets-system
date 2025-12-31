'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Users, Store, ClipboardList, LogOut, Menu, X, Settings, HelpCircle, Bell, Calendar, FileText, MessageSquare, Briefcase, Landmark, BarChart3, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api-client';

interface SidebarProps {
  userRole?: 'ADMIN' | 'USER' | 'DEVELOPER' | 'TECHNICAL';
  username?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, username, onTabChange, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Update active tab from URL params for admin
    if (pathname === '/admin') {
      const tab = searchParams.get('tab') || 'overview';
      setActiveTab(tab);
    } else if (pathname?.startsWith('/admin/teams')) {
      setActiveTab('teams');
    } else if (pathname?.startsWith('/admin/users')) {
      setActiveTab('users');
    } else if (pathname === '/dashboard') {
      const view = searchParams.get('view') || 'overview';
      setActiveTab(view);
    }
  }, [pathname, searchParams]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleNavClick = (key: string, href: string) => {
    setIsMobileMenuOpen(false);
    setActiveTab(key);
    
    // Call onNavigate to clear any detail views
    if (onNavigate) onNavigate();
    
    if (pathname?.startsWith('/admin') && key !== 'overview' && href.includes('?tab=')) {
      // For admin, use query params for tabs
      router.push(`/admin?tab=${key}`);
      if (onTabChange) onTabChange(key);
    } else if (pathname?.startsWith('/admin') && key === 'overview') {
      router.push('/admin');
      if (onTabChange) onTabChange('overview');
    } else if (pathname?.startsWith('/dashboard')) {
      // For user dashboard
      if (key === 'overview') {
        router.push('/dashboard');
      } else {
        router.push(`/dashboard?view=${key}`);
      }
      if (onTabChange) onTabChange(key);
    } else {
      // Navigation between main pages
      router.push(href);
    }
  };

  const menuItems = userRole === 'ADMIN' 
    ? [
        { icon: LayoutGrid, label: 'Dashboard', key: 'overview', href: '/admin' },
        { icon: Users, label: 'Users', key: 'users', href: '/admin/users' },
        { icon: Briefcase, label: 'Teams', key: 'teams', href: '/admin/teams' },
        { icon: Store, label: 'Branches', key: 'branches', href: '/admin?tab=branches' },
        { icon: ClipboardList, label: 'Tickets', key: 'tickets', href: '/admin?tab=tickets' },
        { icon: BarChart3, label: 'Analytics', key: 'analytics', href: '/admin?tab=analytics' },
        { icon: FileSpreadsheet, label: 'Reports', key: 'reports', href: '/admin?tab=reports' },
        { icon: FileText, label: 'Requests', key: 'requests', href: '/admin?tab=requests' },
      ]
    : userRole === 'DEVELOPER' || userRole === 'TECHNICAL'
    ? [
        { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard', key: 'overview' },
        { icon: ClipboardList, label: 'Assigned Tickets', href: '/dashboard?view=tickets', key: 'tickets' },
        { icon: Users, label: 'Profile', href: '/dashboard?view=profile', key: 'profile' },
      ]
    : [
        { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard', key: 'overview' },
        { icon: ClipboardList, label: 'My Tickets', href: '/dashboard?view=tickets', key: 'tickets' },
        { icon: BarChart3, label: 'Analytics', href: '/dashboard?view=analytics', key: 'analytics' },
        { icon: FileText, label: 'Requests', href: '/dashboard?view=requests', key: 'requests' },
        { icon: Users, label: 'Profile', href: '/dashboard?view=profile', key: 'profile' },
      ];

  const MenuContent = () => (
    <>
      {/* Header Section - Fixed at top */}
      <div className={`p-6 pb-4 shrink-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Ticket System</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Landmark className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* User Profile Section */}
      {username && (
        <div className={`px-6 mb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm ${isCollapsed ? 'justify-center w-12 h-12 p-0' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{username}</p>
                <p className="text-xs text-slate-500 font-medium capitalize">{userRole?.toLowerCase()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Navigation Section */}
      <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-6'}`}>
        <nav className={`space-y-2 ${isCollapsed ? 'px-0' : 'px-2'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key, item.href)}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                {!isCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sign Out Button - Fixed at bottom */}
      <div className="shrink-0 p-6 border-t border-slate-100">
        <button
          onClick={() => setShowLogoutModal(true)}
          className={`w-full flex items-center gap-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group ${isCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'}`}
          title={isCollapsed ? 'Sign Out' : ''}
        >
          <LogOut className="w-5 h-5 transition-colors text-slate-400 group-hover:text-red-500" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
      
      {/* Collapse Toggle Button (Desktop Only) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm text-slate-500 hover:text-slate-900 z-50"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-slate-900" />
        ) : (
          <Menu className="w-6 h-6 text-slate-900" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-[#f8f9fa] border-r border-slate-200 flex flex-col z-40 transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : `-translate-x-full lg:translate-x-0 ${isCollapsed ? 'w-16' : 'w-72'}`
        }`}
      >
        <MenuContent />
      </aside>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block shrink-0 bg-[#f8f9fa] transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`} />

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
              <LogOut className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to leave?</h3>
            <p className="text-slate-500">
              Are you sure you want to sign out of your account?
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
