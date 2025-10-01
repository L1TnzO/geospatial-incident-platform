import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'
import './App.css'

const App = () => (
  <Routes>
    <Route path="/" element={<AppLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
)

export default App
