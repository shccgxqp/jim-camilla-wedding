import { Link, useLocation } from 'react-router-dom';

export default function SiteVersionSwitch() {
  const { pathname } = useLocation();

  if (pathname !== '/' && pathname !== '/v2') return null;

  return (
    <nav className="site-version-switch" aria-label="網站版本切換">
      <Link className={pathname === '/' ? 'active' : ''} to="/">原版</Link>
      <Link className={pathname === '/v2' ? 'active' : ''} to="/v2">新版</Link>
    </nav>
  );
}
