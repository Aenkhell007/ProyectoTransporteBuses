import { Router } from 'express';

const router = Router();
router.post('/', (req, res) => { res.status(501).json({ error: "Endpoint no implementado" }); });
router.get('/', (req, res) => { res.status(501).json({ error: "Endpoint no implementado" }); });

export default router;
