import { Router } from 'express';
import {
  createIncident,
  getIncidentDetail,
  getIncidentMetadata,
  listIncidents,
  searchIncidentByNumber,
} from '../controllers/incidentsController';

const router = Router();

router.get('/meta', getIncidentMetadata);
router.get('/search', searchIncidentByNumber);
router.post('/', createIncident);
router.get('/', listIncidents);
router.get('/:incidentNumber', getIncidentDetail);

export default router;
