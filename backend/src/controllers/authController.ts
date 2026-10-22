import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
// Importamos las funciones scrypt-v1 establecidas por el equipo
import { hashPassword, verifyPassword } from '../conexion-bd/src/password.js';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, email, password, documento } = req.body;
    
    if (!nombres || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.usuarios.create({
        data: { 
          nombres, 
          apellidos, 
          email: email.toLowerCase(), 
          tipo_documento: 'CEDULA', 
          documento: documento || '9999999999' 
        }
      });
      await tx.credenciales.create({
        data: { usuario_id: newUser.id, password_hash: hashPassword(password) }
      });
      return newUser;
    });

    res.status(201).json({ message: 'Usuario registrado', userId: result.id });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'El correo ya está registrado.' });
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Falta JWT_SECRET en el servidor.' });
    }

    const user = await prisma.usuarios.findUnique({
      where: { email: email.toLowerCase() },
      include: { credenciales: true, usuario_roles_globales: { include: { roles: true } } }
    });

    const credencial = user?.credenciales[0];
    if (!user || !credencial || !verifyPassword(password, credencial.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const rol = user.usuario_roles_globales[0]?.roles?.codigo || 'CLIENTE';
    const token = jwt.sign(
      { id: user.id, rol, cooperativa_id: user.cooperativa_id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, rol } });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login.' });
  }
};
