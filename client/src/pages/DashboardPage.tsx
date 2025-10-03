import MapView from '@/components/MapView';
import IncidentTable from '@/components/IncidentTable';

const DashboardPage = () => (
  <div className="dashboard-page">
    <section className="dashboard-page__intro">
      <h1>Incident Overview</h1>
      <p>
        The map below streams the latest reported incidents from the operations API. Use it to
        monitor activity in real time while filters, clustering, and analytics layers continue to
        roll out in upcoming milestones.
      </p>
    </section>
    <MapView />
    <IncidentTable />
  </div>
);

export default DashboardPage;
