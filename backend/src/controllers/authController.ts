import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../../conexion-bd/src/password.js';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, email, password, documento } = req.body;
    
    if (!nombres || !email || !password || !documento) {
      return res.status(400).json({ error: 'Faltan campos obligatorios, incluyendo el documento de identidad.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.usuarios.create({
        data: { 
          nombres, 
          apellidos, 
          email: email.toLowerCase(), 
          tipo_documento: 'CEDULA', 
          documento 
        }
      });
      await tx.credenciales.create({
        data: { usuario_id: newUser.id, password_hash: hashPassword(password) }
      });
      return newUser;
    });

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.id });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'El correo o documento ya están registrados.' });
    res.status(500).json({ error: 'Error interno al registrar usuario.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Falta configuración del JWT_SECRET.' });
    }

    const user = await prisma.usuarios.findFirst({
      where: { email: email.toLowerCase() },
      include: { 
        credenciales: true, 
        usuario_roles_globales: { include: { roles: true } },
        membresias: true
      }
    });

    if (!user || !user.credenciales || !verifyPassword(password, user.credenciales.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (user.estado === 'INACTIVO' || user.activo === false) {
      return res.status(403).json({ error: 'Acceso denegado. El usuario está inactivo.' });
    }

    const rol = user.usuario_roles_globales?.[0]?.roles?.codigo || 'CLIENTE';
    const cooperativa_id = user.membresias?.[0]?.cooperativa_id || null;

    const token = jwt.sign(
      { id: user.id, rol, cooperativa_id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, rol, cooperativa_id } });
  } catch (error) {
    res.status(500).json({ error: 'Error en el inicio de sesión.' });
  }
};
