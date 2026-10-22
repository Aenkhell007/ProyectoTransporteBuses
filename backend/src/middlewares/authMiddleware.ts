import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verificarToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Falta configuración de JWT_SECRET.' });

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    (req as any).usuario = decodificado;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

export const esAdministrador = (req: Request, res: Response, next: NextFunction) => {
  const usuario = (req as any).usuario;
  if (usuario && (usuario.rol === 'ADMIN_SISTEMA' || usuario.rol === 'COOPERATIVA')) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol administrativo.' });
  }
};
