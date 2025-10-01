import MapView from '@/components/MapView'

const DashboardPage = () => (
  <div className="dashboard-page">
    <section className="dashboard-page__intro">
      <h1>Incident Overview</h1>
      <p>
        This map highlights the operational area. Future iterations will display
        live incident markers, filters, and analytics layers sourced from the
        backend services.
      </p>
    </section>
    <MapView />
  </div>
)

export default DashboardPage
