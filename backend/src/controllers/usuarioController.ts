import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../conexion-bd/src/password.js';

const prisma = new PrismaClient();

export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarioActual = (req as any).usuario;
    
    // Si es admin de cooperativa, solo ve a los usuarios de su membresía
    const whereClause = usuarioActual.rol === 'COOPERATIVA' 
      ? { membresias: { some: { cooperativa_id: usuarioActual.cooperativa_id } } } 
      : {};

    const usuarios = await prisma.usuarios.findMany({
      where: whereClause,
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        usuario_roles_globales: { include: { roles: true } },
        membresias: true
      }
    });
    res.json({ data: usuarios });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, email, password, documento, rol_codigo, cooperativa_id } = req.body;
    const usuarioActual = (req as any).usuario;
    
    if (!nombres || !email || !password || !documento || !rol_codigo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    // Prevención de escalada de privilegios y aislamiento por cooperativa
    if (usuarioActual.rol === 'COOPERATIVA') {
      if (rol_codigo === 'ADMIN_SISTEMA') {
        return res.status(403).json({ error: 'No tiene permisos para crear administradores del sistema.' });
      }
      if (cooperativa_id !== usuarioActual.cooperativa_id) {
        return res.status(403).json({ error: 'Solo puede crear usuarios para su propia cooperativa.' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.usuarios.create({
        data: { nombres, apellidos, email: email.toLowerCase(), tipo_documento: 'CEDULA', documento }
      });

      await tx.credenciales.create({
        data: { usuario_id: newUser.id, password_hash: hashPassword(password) }
      });

      const rolDb = await tx.roles.findUnique({ where: { codigo: rol_codigo } });
      if (rolDb) {
        await tx.usuario_roles_globales.create({
          data: { usuario_id: newUser.id, rol_id: rolDb.id }
        });
      }

      if (cooperativa_id) {
        await tx.membresias.create({
          data: { usuario_id: newUser.id, cooperativa_id }
        });
      }

      return newUser;
    });
    
    res.status(201).json({ message: 'Usuario creado', userId: result.id });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'El email o documento ya existe.' });
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
