// Stub explícito: rechaza la petición hasta implementar validación JWT real
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    return res.status(501).json({ error: "Validacion de roles no implementada (Stub)" });
  };
};
