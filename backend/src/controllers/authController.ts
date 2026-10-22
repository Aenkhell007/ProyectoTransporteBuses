import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../../conexion-bd/src/password.js';
import { prisma } from '../../conexion-bd/src/db.js';
 
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
const esTextoValido = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;
 
export const register = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, email, password, documento } = req.body ?? {};
 
    if (
      !esTextoValido(nombres) ||
      !esTextoValido(apellidos) ||
      !esTextoValido(email) ||
      !esTextoValido(password) ||
      !esTextoValido(documento)
    ) {
      res.status(400).json({
        error: 'Faltan campos obligatorios: nombres, apellidos, email, password y documento.'
      });
      return;
    }
 
    const emailNormalizado = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailNormalizado)) {
      res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
      return;
    }
 
    const passwordHash = await hashPassword(password);
 
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.usuarios.create({
        data: {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: emailNormalizado,
          tipo_documento: 'CEDULA',
          documento: documento.trim()
        }
      });
 
      await tx.credenciales.create({
        data: { usuario_id: newUser.id, password_hash: passwordHash }
      });
 
      return newUser;
    });
 
    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.id });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'El correo o documento ya están registrados.' });
      return;
    }
    res.status(500).json({ error: 'Error interno al registrar usuario.' });
  }
};
 
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
 
    if (!esTextoValido(email) || !esTextoValido(password)) {
      res.status(400).json({ error: 'Faltan campos obligatorios: email y contraseña.' });
      return;
    }
 
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ error: 'Falta configuración del JWT_SECRET.' });
      return;
    }
 
    const user = await prisma.usuarios.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: {
        credenciales: true,
        usuario_roles_globales: { include: { roles: true } },
        membresias: { include: { roles: true } }
      }
    });
 
    const passwordOk =
      !!user?.credenciales && (await verifyPassword(password, user.credenciales.password_hash));
 
    if (!user || !passwordOk) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }
 
    if (user.activo === false) {
      res.status(403).json({ error: 'Acceso denegado. El usuario está inactivo.' });
      return;
    }
 
    // Membresías activas (si la tabla tiene columna "activo" se respeta; si no, todas cuentan).
    const membresiasActivas = (user.membresias ?? []).filter((m) =>
      'activo' in m ? m.activo !== false : true
    );
    const membresiaConRol = membresiasActivas.find((m) => m.roles) ?? null;
    const membresia = membresiaConRol ?? membresiasActivas[0] ?? null;
 
    // Prioridad: rol global > rol de la membresía activa > CLIENTE por defecto.
    const rolGlobal = user.usuario_roles_globales?.[0]?.roles?.codigo;
    const rolMembresia = membresiaConRol?.roles?.codigo;
    const rol = rolGlobal || rolMembresia || 'CLIENTE';
 
    // La cooperativa sale de la misma membresía de la que se tomó el rol.
    const cooperativa_id = membresia?.cooperativa_id ?? null;
 
    // TODO (con Mikel): alinear este payload con el contexto de sesión y las reglas RLS de la BD.
    const token = jwt.sign({ id: user.id, rol, cooperativa_id }, process.env.JWT_SECRET, {
      expiresIn: '8h'
    });
 
    res.json({ token, user: { id: user.id, email: user.email, rol, cooperativa_id } });
  } catch (error) {
    res.status(500).json({ error: 'Error en el inicio de sesión.' });
  }
};
