import { Router } from 'express';
import healthRouter from './health';
import incidentsRouter from './incidents';

const router = Router();

router.use('/api/incidents', incidentsRouter);
router.use(healthRouter);

export default router;
