import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const crearCooperativaConResponsable = async (req: Request, res: Response) => {
  const { cooperativa, responsable } = req.body;
  
  if (!cooperativa?.nombre || !responsable?.email || !responsable?.password) {
    return res.status(400).json({ error: 'Datos incompletos.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(responsable.password, 10);

    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaCoop = await tx.cooperativas.create({
        data: { nombre: cooperativa.nombre }
      });

      const nuevoAdmin = await tx.usuarios.create({
        data: {
          nombres: responsable.nombres,
          apellidos: responsable.apellidos,
          email: responsable.email,
          password: hashedPassword,
          rol: 'COOPERATIVA',
          cooperativa_id: nuevaCoop.id
        }
      });

      return { cooperativaId: nuevaCoop.id, responsableId: nuevoAdmin.id };
    });

    res.status(201).json({ message: 'Cooperativa creada', data: resultado });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Datos duplicados.' });
    res.status(500).json({ error: 'Error interno.' });
  }
};
