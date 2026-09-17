import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';

// navItems: [{ to, label, icon, badge? }]
export default function Sidebar({ brandLabel, portalLabel, navItems, iconBg = 'bg-primary' }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/login');
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-border/80 h-screen sticky top-0 flex flex-col z-20 shadow-xs">
      {/* Brand Header — click to return to portal dashboard */}
      <Link
        to={navItems[0]?.to || '/'}
        className="flex items-center gap-3 px-5 py-5 border-b border-border/70 bg-slate-50/40 hover:bg-slate-100/70 transition-colors group"
        title="Return to Dashboard"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center shadow-sm shadow-primary/25 shrink-0 group-hover:scale-105 transition-transform">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2l2.9 6.3L22 9.3l-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-1z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-heading font-bold text-text text-sm tracking-tight leading-tight truncate group-hover:text-primary transition-colors">
            {brandLabel || 'ReturnFlow'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] font-medium text-text-muted leading-tight truncate">
              {portalLabel}
            </p>
          </div>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav
        aria-label={`${portalLabel} navigation`}
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 ${
                isActive
                  ? 'bg-primary-50 text-primary shadow-xs shadow-primary/5 font-bold border border-primary-100/80'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text'
              }`
            }
          >
            <span className="flex items-center gap-2.5">
              <span className="transition-transform group-hover:scale-110 duration-150">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </span>
            {item.badge != null && item.badge > 0 && (
              <span className="text-[10px] font-bold bg-primary-100 text-primary rounded-full px-2 py-0.5 min-w-[20px] text-center border border-primary-200">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      {user && (
        <div className="p-3 border-t border-border/70 bg-slate-50/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-border/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary font-heading font-bold text-xs flex items-center justify-center shrink-0 border border-primary-200">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                  {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-danger hover:bg-rose-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
