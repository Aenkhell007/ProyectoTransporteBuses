import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: { id: true, nombres: true, apellidos: true, email: true, rol: true, cooperativa_id: true }
    });
    res.json({ data: usuarios });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, email, password, rol, cooperativa_id } = req.body;
    const usuarioActual = (req as any).usuario;
    
    if (!nombres || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (usuarioActual.rol === 'COOPERATIVA' && cooperativa_id !== usuarioActual.cooperativa_id) {
      return res.status(403).json({ error: 'No puede crear usuarios para otra cooperativa' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = await prisma.usuarios.create({
      data: { nombres, apellidos, email, password: hashedPassword, rol, cooperativa_id }
    });
    
    res.status(201).json({ message: 'Usuario creado', userId: nuevoUsuario.id });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'El email ya está registrado.' });
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
