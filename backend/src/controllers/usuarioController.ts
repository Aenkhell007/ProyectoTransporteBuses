import { Request, Response } from 'express';
import { prisma } from '../../conexion-bd/src/db.js';
import { hashPassword } from '../../conexion-bd/src/password.js';
 
 
export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarioActual = (req as any).usuario;
    const whereClause =
      usuarioActual.rol === 'COOPERATIVA'
        ? { membresias: { some: { cooperativa_id: usuarioActual.cooperativa_id } } }
        : {};
 
    const usuarios = await prisma.usuarios.findMany({
      where: whereClause,
      select: { id: true, nombres: true, apellidos: true, email: true, membresias: true }
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
      res.status(400).json({ error: 'Faltan campos obligatorios.' });
      return;
    }
 
    if (usuarioActual.rol === 'COOPERATIVA') {
      if (cooperativa_id !== usuarioActual.cooperativa_id) {
        res.status(403).json({ error: 'Solo puede crear usuarios para su propia cooperativa.' });
        return;
      }
      // Un admin de cooperativa no puede escalar privilegios a nivel sistema.
      if (rol_codigo === 'ADMIN_SISTEMA') {
        res.status(403).json({ error: 'No puede asignar ese rol.' });
        return;
      }
    }
 
    // Se valida el rol ANTES de la transaccion para no crear datos a medias.
    const rolDb = await prisma.roles.findUnique({ where: { codigo: rol_codigo } });
    if (!rolDb) {
      res.status(400).json({ error: 'Rol no encontrado.' });
      return;
    }
 
    const passwordHash = await hashPassword(password);
 
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.usuarios.create({
        data: { nombres, apellidos, email: email.toLowerCase(), tipo_documento: 'CEDULA', documento }
      });
 
      await tx.credenciales.create({
        data: { usuario_id: newUser.id, password_hash: passwordHash }
      });
 
      if (cooperativa_id) {
        // Rol de cooperativa -> membresias.rol_id
        await tx.membresias.create({
          data: {
            usuario_id: newUser.id,
            cooperativa_id,
            rol_id: rolDb.id
          }
        });
      } else {
        // Rol global -> usuario_roles_globales
        await tx.usuario_roles_globales.create({
          data: { usuario_id: newUser.id, rol_id: rolDb.id }
        });
      }
 
      return newUser;
    });
 
    res.status(201).json({ message: 'Usuario creado', userId: result.id });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'El email o documento ya existe.' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
