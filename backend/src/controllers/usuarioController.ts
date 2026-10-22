import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarios = await prisma.user.findMany({
      select: { id: true, nombres: true, apellidos: true, email: true, role: true, cooperativeId: true }
    });
    res.json({ data: usuarios });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, email, password, role, cooperativeId } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const nuevoUsuario = await prisma.user.create({
      data: { nombres, apellidos, email, password: hashedPassword, role, cooperativeId }
    });
    
    res.status(201).json({ message: 'Usuario creado exitosamente', userId: nuevoUsuario.id });
  } catch (error) {
    res.status(409).json({ error: 'Conflicto al crear el usuario. Verifique el email.' });
  }
};
