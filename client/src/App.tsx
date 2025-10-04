import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import OverviewPage from '@/pages/OverviewPage';

const App = () => (
  <Routes>
    <Route path="/" element={<AppLayout />}>
      <Route index element={<OverviewPage />} />
      <Route path="overview" element={<OverviewPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default App;
