import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
 
const prisma = new PrismaClient();
 
// El rol NO se expone en el perfil.
const perfilSelect = { id: true, nombres: true, apellidos: true, email: true };
 
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
    const { nombres, apellidos } = req.body;
 
    const perfilActualizado = await prisma.usuarios.update({
      where: { id: usuarioId },
      data: { nombres, apellidos },
      select: perfilSelect
    });
    res.json(perfilActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};
