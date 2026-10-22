import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const crearCooperativaConResponsable = async (req: Request, res: Response) => {
  const { cooperativa, responsable } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(responsable.password, 10);

    // Prisma Transaction asegura que ambas entidades se creen juntas
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaCoop = await tx.cooperative.create({
        data: { name: cooperativa.name }
      });

      const nuevoAdmin = await tx.user.create({
        data: {
          nombres: responsable.nombres,
          apellidos: responsable.apellidos,
          email: responsable.email,
          password: hashedPassword,
          role: 'Cooperativa',
          cooperativeId: nuevaCoop.id
        }
      });

      return { cooperativaId: nuevaCoop.id, responsableId: nuevoAdmin.id };
    });

    res.status(201).json({ message: 'Cooperativa y responsable creados', data: resultado });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar la cooperativa' });
  }
};
