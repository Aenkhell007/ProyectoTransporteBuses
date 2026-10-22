import { Router } from 'express';
import { obtenerUsuarios, crearUsuario } from '../controllers/usuarioController';
import { verificarToken, esAdministrador } from '../middlewares/authMiddleware';

const router = Router();

router.use(verificarToken, esAdministrador); // Requiere estar logueado y ser Admin
router.get('/', obtenerUsuarios);
router.post('/', crearUsuario);

export default router;
