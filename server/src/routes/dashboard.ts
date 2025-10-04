import { Router } from 'express';
import {
  getDailyTrend,
  getIncidentsByType,
  getLast24HoursKpi,
  getRecentIncidents,
  getSeverityDistribution,
} from '../controllers/dashboardController';

const router = Router();

router.get('/kpi/last-24h', getLast24HoursKpi);
router.get('/incidents/by-type', getIncidentsByType);
router.get('/incidents/daily-trend', getDailyTrend);
router.get('/incidents/severity-distribution', getSeverityDistribution);
router.get('/incidents/recent', getRecentIncidents);

export default router;
