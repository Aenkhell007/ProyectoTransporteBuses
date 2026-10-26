import { Request, Response } from 'express';
import { prisma } from '../../conexion-bd/src/db.js';
 
// No existe columna "rol" en usuarios: el rol se resuelve por relaciones.
// - Roles globales: usuario_roles_globales
// - Roles de cooperativa: membresias (rol_id)
const perfilSelect = {
  id: true,
  nombres: true,
  apellidos: true,
  email: true,
  usuario_roles_globales: { select: { roles: { select: { codigo: true } } } },
  membresias: { select: { cooperativa_id: true, roles: { select: { codigo: true } } } }
};
 
const esTextoValido = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;
 
export const obtenerMiPerfil = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const perfil = await prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: perfilSelect
    });
 
    if (!perfil) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
 
    res.json(perfil);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
};
 
export const actualizarMiPerfil = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const { nombres, apellidos } = req.body ?? {};
 
    if (nombres === undefined && apellidos === undefined) {
      res.status(400).json({ error: 'Debe enviar nombres o apellidos para actualizar.' });
      return;
    }
    if (
      (nombres !== undefined && !esTextoValido(nombres)) ||
      (apellidos !== undefined && !esTextoValido(apellidos))
    ) {
      res.status(400).json({ error: 'Nombres y apellidos deben ser texto no vacío.' });
      return;
    }
 
    const perfilActualizado = await prisma.usuarios.update({
      where: { id: usuarioId },
      data: {
        ...(nombres !== undefined && { nombres: nombres.trim() }),
        ...(apellidos !== undefined && { apellidos: apellidos.trim() })
      },
      select: perfilSelect
    });
    res.json(perfilActualizado);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};
