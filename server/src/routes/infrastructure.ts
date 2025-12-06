import { Router } from 'express';
import { listInfrastructure } from '../controllers/infrastructureController';

const router = Router();

router.get('/', listInfrastructure);

export default router;
