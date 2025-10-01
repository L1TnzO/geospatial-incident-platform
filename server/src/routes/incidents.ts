import { Router } from 'express';
import { getIncidentDetail, listIncidents } from '../controllers/incidentsController';

const router = Router();

router.get('/', listIncidents);
router.get('/:incidentNumber', getIncidentDetail);

export default router;
