import type { Request, Response } from 'express';
import { infrastructureRepository } from '../db';

export const listInfrastructure = async (req: Request, res: Response): Promise<void> => {
    const infra = await infrastructureRepository.listInfrastructure();
    res.json({ data: infra });
};
