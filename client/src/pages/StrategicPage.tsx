import { StrategicLayout } from '../components/strategic/StrategicLayout';
import { DashboardProvider } from '../providers/dashboard-provider';

export function StrategicPage() {
  return (
    <DashboardProvider>
      <StrategicLayout />
    </DashboardProvider>
  );
}
