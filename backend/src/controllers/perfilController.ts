import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerMiPerfil = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const perfil = await prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: { id: true, nombres: true, apellidos: true, email: true, rol: true }
    });
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
      select: { id: true, nombres: true, apellidos: true, email: true }
    });
    res.json(perfilActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};
