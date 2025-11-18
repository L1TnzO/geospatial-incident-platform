import { Router } from 'express';
import healthRouter from './health';
import incidentsRouter from './incidents';
import dashboardRouter from './dashboard';
import stationsRouter from './stations';
import strategicRouter from './strategic';

const router = Router();

const mountRoutes = (prefix: string) => {
	const normalizedPrefix = prefix === '' ? '' : `/${prefix.replace(/^\/+|\/+$/g, '')}`;

	router.use(`${normalizedPrefix}/incidents`, incidentsRouter);
	router.use(`${normalizedPrefix}/dashboard`, dashboardRouter);
	router.use(`${normalizedPrefix}/stations`, stationsRouter);
	router.use(`${normalizedPrefix}/strategic`, strategicRouter);
};

// Expose routes under both /api and root for environments with different reverse proxies.
mountRoutes('api');
mountRoutes('');

router.use(healthRouter);

export default router;
