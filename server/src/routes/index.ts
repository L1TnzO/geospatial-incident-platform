import { Router } from 'express';
import healthRouter from './health';
import incidentsRouter from './incidents';
import stationsRouter from './stations';

const router = Router();

router.use('/api/incidents', incidentsRouter);
router.use('/api/stations', stationsRouter);
router.use(healthRouter);

export default router;
