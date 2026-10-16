import { Router } from 'express';

const router = Router();
router.post('/login', (req, res) => { res.status(501).json({ error: "Endpoint no implementado" }); });
router.post('/register', (req, res) => { res.status(501).json({ error: "Endpoint no implementado" }); });

export default router;
