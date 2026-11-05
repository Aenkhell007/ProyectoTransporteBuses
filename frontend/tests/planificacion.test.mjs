import test from "node:test";
import assert from "node:assert/strict";
import {
  instanteEnMs, validarPlanificacion, detectarSolapamientos, proponerBorrador,
} from "../src/features/operacion/planificacion.rules.ts";

const frecuencia = { id: "f1", cooperativaId: "c1", activa: true, gruposHabilitados: ["normal"], tarifaConfigurada: true };
const bus = { id: "b1", cooperativaId: "c1", grupoId: "normal", activo: true, planoDisponible: true, diasDescanso: [] };
const inicioISO = "2026-11-02T08:00:00-05:00";
const finISO = "2026-11-02T10:00:00-05:00";
const solicitud = { frecuencia, bus, inicioISO, finISO };
const existente = { id: "a1", busId: "b1", inicioISO: "2026-11-02T09:00:00-05:00", finISO: "2026-11-02T11:00:00-05:00", estado: "PUBLICADO" };

test("rechaza fechas inexistentes, sin zona y rangos invertidos", () => {
  assert.equal(instanteEnMs("2026-02-30T08:00:00-05:00"), null);
  assert.equal(instanteEnMs("2026-11-02T08:00:00"), null);
  assert.ok(validarPlanificacion({ ...solicitud, finISO: inicioISO }, []).errores.includes("HORARIO_INVALIDO"));
});

test("permite borrador válido y exige plano y tarifa para publicar", () => {
  const incompleta = { ...solicitud, frecuencia: { ...frecuencia, tarifaConfigurada: false }, bus: { ...bus, planoDisponible: false } };
  assert.equal(validarPlanificacion(incompleta, []).valida, true);
  const resultado = validarPlanificacion(incompleta, [], { paraPublicar: true });
  assert.ok(resultado.errores.includes("SIN_PLANO"));
  assert.ok(resultado.errores.includes("SIN_TARIFA"));
});

test("bloquea frecuencia inactiva, otro grupo, otra cooperativa y descanso", () => {
  const invalida = {
    ...solicitud,
    frecuencia: { ...frecuencia, activa: false },
    bus: { ...bus, cooperativaId: "c2", grupoId: "vip", diasDescanso: ["2026-11-02"] },
  };
  const errores = validarPlanificacion(invalida, []).errores;
  for (const codigo of ["FRECUENCIA_INACTIVA", "COOPERATIVA_INCOMPATIBLE", "GRUPO_NO_HABILITADO", "BUS_EN_DESCANSO"]) {
    assert.ok(errores.includes(codigo));
  }
});

test("detecta solapes y margen, sin bloquear otros buses ni cancelados", () => {
  assert.deepEqual(detectarSolapamientos(solicitud, [existente]), ["a1"]);
  const cercana = { ...existente, inicioISO: "2026-11-02T10:15:00-05:00", finISO: "2026-11-02T11:00:00-05:00" };
  assert.deepEqual(detectarSolapamientos(solicitud, [cercana]), ["a1"]);
  assert.deepEqual(detectarSolapamientos(solicitud, [cercana], 0), []);
  assert.deepEqual(detectarSolapamientos(solicitud, [{ ...existente, estado: "CANCELADO" }]), []);
  assert.deepEqual(detectarSolapamientos(solicitud, [{ ...existente, busId: "b2" }]), []);
});

test("propone únicamente borrador y evita el bus ocupado", () => {
  const otroBus = { ...bus, id: "b2" };
  const propuesta = proponerBorrador(frecuencia, [bus, otroBus], inicioISO, finISO, [existente]);
  assert.deepEqual(propuesta, { frecuenciaId: "f1", busId: "b2", inicioISO, finISO, estado: "BORRADOR" });
  assert.equal(proponerBorrador(frecuencia, [bus], inicioISO, finISO, [existente]), null);
});
