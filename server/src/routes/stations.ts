import { Router } from 'express';
import { listStations } from '../controllers/stationsController';

const router = Router();

router.get('/', listStations);

export default router;
