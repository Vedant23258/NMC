import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/auth-hooks';
import { hasCapability } from '@/core/rbac/capability-map';
import { navItems } from '@/app/router/route-config';
import { Button } from '@/shared/ui/button';
import { titleCase } from '@/shared/utils/format';

export const AppShell = () => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((part) => titleCase(part));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>NMC</span>
          <strong>Smart Sanitation</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems
            .filter((item) => hasCapability(currentUser?.role, item.capability))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Municipal operations dashboard</p>
            <div className="breadcrumbs">{crumbs.length ? crumbs.join(' / ') : 'Dashboard'}</div>
          </div>
          <div className="topbar-actions">
            <div className="user-chip">
              <strong>{currentUser?.name}</strong>
              <span>{currentUser?.title}</span>
            </div>
            <Button variant="secondary" onClick={() => void logout()}>
              Logout
            </Button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
