import { Link } from 'react-router-dom'

const NotFoundPage = () => (
  <div className="not-found">
    <h1>Page not found</h1>
    <p>The page you are looking for doesn&apos;t exist.</p>
    <Link to="/">Return to dashboard</Link>
  </div>
)

export default NotFoundPage
