import { NavLink } from 'react-router-dom';

const HeaderNav = () => (
  <header className="app-header">
    <div className="app-header__brand">
      <span aria-hidden="true">🗺️</span>
      <strong>Geospatial Incident Platform</strong>
    </div>
    <nav aria-label="Primary">
      <ul className="app-nav">
        <li>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Overview
          </NavLink>
        </li>
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/strategic" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Strategic
          </NavLink>
        </li>
      </ul>
    </nav>
  </header>
);

export default HeaderNav;
