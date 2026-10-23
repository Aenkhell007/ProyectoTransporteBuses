import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../conexion-bd/src/password.js';
 
const prisma = new PrismaClient();
 
export const crearCooperativaConResponsable = async (req: Request, res: Response) => {
  const { cooperativa, responsable } = req.body;
  const usuarioActual = (req as any).usuario;
 
  if (usuarioActual.rol !== 'ADMIN_SISTEMA') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos.' });
    return;
  }
 
  if (
    !cooperativa?.nombre ||
    !cooperativa?.razon_social ||
    !cooperativa?.ruc ||
    !responsable?.email ||
    !responsable?.password ||
    !responsable?.documento
  ) {
    res.status(400).json({ error: 'Datos incompletos.' });
    return;
  }
 
  try {
    // Se valida el rol ANTES de la transaccion para no crear datos a medias.
    const rolDb = await prisma.roles.findUnique({ where: { codigo: 'COOPERATIVA' } });
    if (!rolDb) {
      res.status(400).json({ error: 'Rol COOPERATIVA no encontrado.' });
      return;
    }
 
    const passwordHash = await hashPassword(responsable.password);
 
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaCoop = await tx.cooperativas.create({
        data: {
          nombre: cooperativa.nombre,
          razon_social: cooperativa.razon_social,
          ruc: cooperativa.ruc
        }
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
        data: { usuario_id: nuevoAdmin.id, password_hash: passwordHash }
      });
 
      // Rol de cooperativa -> vive en la membresia (rol_id).
      await tx.membresias.create({
        data: {
          usuario_id: nuevoAdmin.id,
          cooperativa_id: nuevaCoop.id,
          rol_id: rolDb.id
        }
      });
 
      return { cooperativaId: nuevaCoop.id, responsableId: nuevoAdmin.id };
    });
 
    res.status(201).json({ message: 'Cooperativa y responsable creados', data: resultado });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Datos duplicados.' });
      return;
    }
    res.status(500).json({ error: 'Error interno.' });
  }
};
