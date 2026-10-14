// Middleware para validar roles: CLIENTE, OFICINISTA, ADMIN_COOPERATIVA, ADMIN_GENERAL
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Aquí irá la validación del token JWT y el rol del usuario
    next();
  };
};
