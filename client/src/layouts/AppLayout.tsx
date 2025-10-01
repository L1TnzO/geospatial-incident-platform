import { Outlet } from 'react-router-dom'
import HeaderNav from '@/components/HeaderNav'

const AppLayout = () => (
  <div className="app-shell">
    <HeaderNav />
    <main className="app-main" role="main">
      <Outlet />
    </main>
  </div>
)

export default AppLayout
