import { Router } from 'express';
import { crearCooperativaConResponsable } from '../controllers/cooperativaController';
import { verificarToken, esAdministrador } from '../middlewares/authMiddleware';

const router = Router();

router.post('/con-responsable', verificarToken, esAdministrador, crearCooperativaConResponsable);

export default router;
