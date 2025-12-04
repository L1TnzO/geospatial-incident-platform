import { Router } from 'express';
import {
  getMonthlyTrend,
  getDailyTrend,
  getQuarterlyTrends,
  getTypeTimeline,
  getCoverageBuffers,
  getResponseMetrics,
  getPriorityScores,
  getHotspots,
} from '../controllers/strategicController';

const router = Router();

router.get('/trends/monthly', getMonthlyTrend);
router.get('/trends/daily', getDailyTrend);
router.get('/trends/quarters', getQuarterlyTrends);
router.get('/trends/types', getTypeTimeline);
router.get('/coverage-buffers', getCoverageBuffers);
router.get('/response-metrics', getResponseMetrics);
router.get('/priority-scores', getPriorityScores);
router.get('/hotspots', getHotspots);

export default router;
