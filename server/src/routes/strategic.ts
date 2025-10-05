import { Router } from 'express';
import {
  getMonthlyTrend,
  getQuarterlyTrends,
  getTypeTimeline,
} from '../controllers/strategicController';

const router = Router();

router.get('/trends/monthly', getMonthlyTrend);
router.get('/trends/quarters', getQuarterlyTrends);
router.get('/trends/types', getTypeTimeline);

export default router;
