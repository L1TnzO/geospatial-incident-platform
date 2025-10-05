import { Router } from 'express';
import healthRouter from './health';
import incidentsRouter from './incidents';
import dashboardRouter from './dashboard';
import stationsRouter from './stations';
import strategicRouter from './strategic';

const router = Router();

router.use('/api/incidents', incidentsRouter);
router.use('/api/dashboard', dashboardRouter);
router.use('/api/stations', stationsRouter);
router.use('/api/strategic', strategicRouter);
router.use(healthRouter);

export default router;
