import { Router } from 'express';
import { obtenerMiPerfil, actualizarMiPerfil } from '../controllers/perfilController';
import { verificarToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(verificarToken); // Protege todas las rutas de este archivo
router.get('/me', obtenerMiPerfil);
router.patch('/me', actualizarMiPerfil);

export default router;
