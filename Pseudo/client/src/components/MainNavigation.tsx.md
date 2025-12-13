MÓDULO components/MainNavigation

IMPORTAR: React-Router Link, Icons.

COMPONENTE MainNavigation(props):

- PROPS: user, onLogin, onLogout.
- HELPERS: isActive path check.

- RENDER:
  - Header sticky.
  - Logo + Brand.
  - Nav Links Row (Si user logged in):
    - Map, Table, Dashboard, Strategic, Report Links.
    - Styles variant ghost vs secondary (active).
  - User Info / Login/Logout button right side.
