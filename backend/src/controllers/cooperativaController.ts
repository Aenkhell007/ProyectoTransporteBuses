import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../conexion-bd/src/password.js';

const prisma = new PrismaClient();

export const crearCooperativaConResponsable = async (req: Request, res: Response) => {
  const { cooperativa, responsable } = req.body;
  const usuarioActual = (req as any).usuario;

  // Validación de permisos administrativos globales
  if (usuarioActual.rol !== 'ADMIN_SISTEMA') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos cooperativas.admin e identidad.admin.' });
  }
  
  if (!cooperativa?.nombre || !responsable?.email || !responsable?.password || !responsable?.documento) {
    return res.status(400).json({ error: 'Datos incompletos.' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaCoop = await tx.cooperativas.create({
        data: { nombre: cooperativa.nombre }
      });

      const nuevoAdmin = await tx.usuarios.create({
        data: {
          nombres: responsable.nombres,
          apellidos: responsable.apellidos,
          email: responsable.email.toLowerCase(),
          tipo_documento: 'CEDULA',
          documento: responsable.documento
        }
      });

      await tx.credenciales.create({
        data: { usuario_id: nuevoAdmin.id, password_hash: hashPassword(responsable.password) }
      });

      const rolDb = await tx.roles.findUnique({ where: { codigo: 'COOPERATIVA' } });
      if (rolDb) {
        await tx.usuario_roles_globales.create({
          data: { usuario_id: nuevoAdmin.id, rol_id: rolDb.id }
        });
      }

      await tx.membresias.create({
        data: { usuario_id: nuevoAdmin.id, cooperativa_id: nuevaCoop.id }
      });

      return { cooperativaId: nuevaCoop.id, responsableId: nuevoAdmin.id };
    });

    res.status(201).json({ message: 'Cooperativa y responsable creados', data: resultado });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Datos duplicados.' });
    res.status(500).json({ error: 'Error interno.' });
  }
};
