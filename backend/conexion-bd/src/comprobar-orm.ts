import { prisma, conSesion } from "./db.js";
try {
  const version = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version FROM transporte.schema_version`;
  console.log("Prisma conectado, esquema:", version[0]?.version);
  if (process.env.SESSION_TOKEN) {
    const visible = await conSesion(process.env.SESSION_TOKEN, (tx) => tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM transporte.usuarios`);
    if (visible.length!==1) throw new Error("La sesión cliente debería ver únicamente su perfil");
    console.log("Sesión y aislamiento RLS comprobados desde Prisma.");
  }
} finally { await prisma.$disconnect(); }
