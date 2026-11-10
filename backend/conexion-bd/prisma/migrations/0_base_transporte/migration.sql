BEGIN;
-- PostgreSQL 15+ / Supabase. Instalación nueva, no destructiva, sin contraseñas.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='transporte') THEN
  RAISE EXCEPTION 'El esquema transporte ya existe. No se borra ni se sobrescribe; use migraciones.';
 END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE SCHEMA transporte;
SET LOCAL search_path=transporte,extensions,public;
CREATE TABLE transporte.schema_version (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
version text NOT NULL UNIQUE, descripcion text NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.usuarios (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombres varchar(100) NOT NULL CHECK(length(trim(nombres))>0), apellidos varchar(100) NOT NULL CHECK(length(trim(apellidos))>0), tipo_documento text NOT NULL DEFAULT 'CEDULA' CHECK(tipo_documento IN('CEDULA','PASAPORTE','OTRO')), documento varchar(30) NOT NULL, email varchar(254) NOT NULL CHECK(email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'), telefono varchar(25), nacimiento date, activo boolean NOT NULL DEFAULT true, email_verificado_at timestamptz, telefono_verificado_at timestamptz, UNIQUE(tipo_documento,documento),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_email_ci ON transporte.usuarios(lower(email));
CREATE TABLE transporte.credenciales (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL UNIQUE REFERENCES transporte.usuarios(id), password_hash text NOT NULL CHECK(length(password_hash)>=30), algoritmo text NOT NULL DEFAULT 'scrypt-v1', password_updated_at timestamptz NOT NULL DEFAULT now(),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.sesiones (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES transporte.usuarios(id), token_hash char(64) NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'), expires_at timestamptz NOT NULL, revocada_at timestamptz, ip inet, user_agent varchar(500), CHECK(expires_at>created_at),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.tokens_identidad (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES transporte.usuarios(id), proposito text NOT NULL CHECK(proposito IN('RECUPERACION','VERIFICAR_EMAIL','INVITACION')), token_hash char(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumido_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.consentimientos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid REFERENCES transporte.usuarios(id), tipo text NOT NULL, version text NOT NULL, aceptado_at timestamptz NOT NULL DEFAULT now(), ip inet,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.roles (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL, ambito text NOT NULL CHECK(ambito IN('GLOBAL','COOPERATIVA','CLIENTE')),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.permisos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, descripcion text NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.rol_permiso (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
rol_id uuid NOT NULL REFERENCES transporte.roles(id), permiso_id uuid NOT NULL REFERENCES transporte.permisos(id), UNIQUE(rol_id,permiso_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.usuario_roles_globales (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES transporte.usuarios(id), rol_id uuid NOT NULL REFERENCES transporte.roles(id), UNIQUE(usuario_id,rol_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.cooperativas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre varchar(150) NOT NULL, razon_social varchar(200) NOT NULL, ruc varchar(20) NOT NULL UNIQUE, activa boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1 CHECK(version>0),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.oficinas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
nombre varchar(100) NOT NULL, direccion varchar(300) NOT NULL, telefono varchar(25), activa boolean NOT NULL DEFAULT true,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id,nombre)
);
CREATE TABLE transporte.membresias (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
usuario_id uuid NOT NULL REFERENCES transporte.usuarios(id), rol_id uuid NOT NULL REFERENCES transporte.roles(id), oficina_id uuid, activa boolean NOT NULL DEFAULT true, FOREIGN KEY(cooperativa_id,oficina_id) REFERENCES transporte.oficinas(cooperativa_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE UNIQUE INDEX membresias_unicas ON transporte.membresias(usuario_id,cooperativa_id,rol_id,coalesce(oficina_id,'00000000-0000-0000-0000-000000000000'::uuid));
CREATE TABLE transporte.config_global (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
clave text NOT NULL UNIQUE, valor jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.archivos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
propietario_id uuid NOT NULL REFERENCES transporte.usuarios(id), cooperativa_id uuid REFERENCES transporte.cooperativas(id), categoria text NOT NULL CHECK(categoria IN('COMPROBANTE','FOTO_BUS','LOGO','QR_BANCARIO','RESPALDO','DOCUMENTO','REEMBOLSO')), ruta_privada text NOT NULL UNIQUE, mime text NOT NULL, bytes bigint NOT NULL CHECK(bytes>0), sha256 char(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'), validado_servidor boolean NOT NULL DEFAULT false,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.config_cooperativa (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
lema varchar(200), logo_archivo_id uuid REFERENCES transporte.archivos(id), color_primario char(7) NOT NULL DEFAULT '#CB102E' CHECK(color_primario ~ '^#[0-9A-Fa-f]{6}$'), color_secundario char(7) NOT NULL DEFAULT '#00833E' CHECK(color_secundario ~ '^#[0-9A-Fa-f]{6}$'), color_texto char(7) NOT NULL DEFAULT '#1A2A33' CHECK(color_texto ~ '^#[0-9A-Fa-f]{6}$'), soporte_email varchar(254), telefono varchar(25), whatsapp varchar(25), direccion text, facebook_url text, instagram_url text, sobre_nosotros text, version integer NOT NULL DEFAULT 1,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id)
);
CREATE TABLE transporte.ciudades (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre varchar(100) NOT NULL, provincia varchar(100) NOT NULL, activa boolean NOT NULL DEFAULT true, UNIQUE(nombre,provincia),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.terminales (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
ciudad_id uuid NOT NULL REFERENCES transporte.ciudades(id), nombre varchar(150) NOT NULL, direccion text, activa boolean NOT NULL DEFAULT true, UNIQUE(ciudad_id,nombre),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.rutas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
nombre varchar(200) NOT NULL, activa boolean NOT NULL DEFAULT true,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.ruta_paradas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
ruta_id uuid NOT NULL, terminal_id uuid NOT NULL REFERENCES transporte.terminales(id), orden integer NOT NULL CHECK(orden>=0), minutos_desde_origen integer NOT NULL CHECK(minutos_desde_origen>=0), FOREIGN KEY(cooperativa_id,ruta_id) REFERENCES transporte.rutas(cooperativa_id,id), UNIQUE(ruta_id,orden), UNIQUE(ruta_id,terminal_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.grupos_bus (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
nombre varchar(100) NOT NULL, descripcion text, activo boolean NOT NULL DEFAULT true, plantilla jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id,nombre)
);
CREATE TABLE transporte.grupo_dias_parada (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
grupo_id uuid NOT NULL, dia_iso integer NOT NULL CHECK(dia_iso BETWEEN 1 AND 7), FOREIGN KEY(cooperativa_id,grupo_id) REFERENCES transporte.grupos_bus(cooperativa_id,id), UNIQUE(grupo_id,dia_iso),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.grupo_turnos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
grupo_id uuid NOT NULL, nombre varchar(100) NOT NULL, orden integer NOT NULL CHECK(orden>0), FOREIGN KEY(cooperativa_id,grupo_id) REFERENCES transporte.grupos_bus(cooperativa_id,id), UNIQUE(grupo_id,orden),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.frecuencias (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
ruta_id uuid NOT NULL, codigo varchar(50) NOT NULL, hora_salida time NOT NULL, resolucion_ant varchar(150) NOT NULL CHECK(length(trim(resolucion_ant))>0), tipo_viaje text NOT NULL CHECK(tipo_viaje IN('DIRECTO','CON_PARADAS')), activa boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1, FOREIGN KEY(cooperativa_id,ruta_id) REFERENCES transporte.rutas(cooperativa_id,id), UNIQUE(cooperativa_id,codigo),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.frecuencia_grupo (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
frecuencia_id uuid NOT NULL, grupo_id uuid NOT NULL, FOREIGN KEY(cooperativa_id,frecuencia_id) REFERENCES transporte.frecuencias(cooperativa_id,id), FOREIGN KEY(cooperativa_id,grupo_id) REFERENCES transporte.grupos_bus(cooperativa_id,id), UNIQUE(frecuencia_id,grupo_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.buses (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
grupo_id uuid NOT NULL, unidad varchar(30) NOT NULL, placa varchar(20) NOT NULL, chasis varchar(100) NOT NULL, carroceria varchar(100) NOT NULL, correo_contacto varchar(254), propietario varchar(200), activo boolean NOT NULL DEFAULT true, FOREIGN KEY(cooperativa_id,grupo_id) REFERENCES transporte.grupos_bus(cooperativa_id,id), UNIQUE(cooperativa_id,unidad), UNIQUE(placa),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.equipamientos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.bus_equipamiento (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
bus_id uuid NOT NULL, equipamiento_id uuid NOT NULL REFERENCES transporte.equipamientos(id), FOREIGN KEY(cooperativa_id,bus_id) REFERENCES transporte.buses(cooperativa_id,id), UNIQUE(bus_id,equipamiento_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.bus_fotos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
bus_id uuid NOT NULL, archivo_id uuid NOT NULL REFERENCES transporte.archivos(id), orden integer NOT NULL DEFAULT 1, FOREIGN KEY(cooperativa_id,bus_id) REFERENCES transporte.buses(cooperativa_id,id), UNIQUE(bus_id,archivo_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.clases_asiento (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.planos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
bus_id uuid NOT NULL, numero_version integer NOT NULL CHECK(numero_version>0), nombre varchar(100) NOT NULL, pisos integer NOT NULL CHECK(pisos BETWEEN 1 AND 3), publicado boolean NOT NULL DEFAULT false, FOREIGN KEY(cooperativa_id,bus_id) REFERENCES transporte.buses(cooperativa_id,id), UNIQUE(bus_id,numero_version), UNIQUE(cooperativa_id,bus_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.plano_celdas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
plano_id uuid NOT NULL, piso integer NOT NULL CHECK(piso BETWEEN 1 AND 3), fila integer NOT NULL CHECK(fila>0), columna integer NOT NULL CHECK(columna BETWEEN 1 AND 12), tipo text NOT NULL CHECK(tipo IN('ASIENTO','PASILLO','BLOQUE')), codigo varchar(20), clase_id uuid REFERENCES transporte.clases_asiento(id), activa boolean NOT NULL DEFAULT true, FOREIGN KEY(cooperativa_id,plano_id) REFERENCES transporte.planos(cooperativa_id,id), UNIQUE(plano_id,piso,fila,columna), UNIQUE(plano_id,codigo), UNIQUE(cooperativa_id,plano_id,id), CHECK((tipo='ASIENTO' AND codigo IS NOT NULL AND clase_id IS NOT NULL) OR (tipo<>'ASIENTO' AND codigo IS NULL AND clase_id IS NULL)),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.indisponibilidades_bus (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
bus_id uuid NOT NULL, desde timestamptz NOT NULL, hasta timestamptz NOT NULL, motivo text NOT NULL, FOREIGN KEY(cooperativa_id,bus_id) REFERENCES transporte.buses(cooperativa_id,id), CHECK(hasta>desde),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.viajes (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
frecuencia_id uuid NOT NULL, bus_id uuid NOT NULL, plano_id uuid NOT NULL, conductor_id uuid REFERENCES transporte.usuarios(id), salida timestamptz NOT NULL, llegada timestamptz NOT NULL, liberacion_bus timestamptz NOT NULL, estado text NOT NULL DEFAULT 'BORRADOR' CHECK(estado IN('BORRADOR','PUBLICADO','EN_RUTA','FINALIZADO','CANCELADO')), version integer NOT NULL DEFAULT 1, FOREIGN KEY(cooperativa_id,frecuencia_id) REFERENCES transporte.frecuencias(cooperativa_id,id), FOREIGN KEY(cooperativa_id,bus_id,plano_id) REFERENCES transporte.planos(cooperativa_id,bus_id,id), CHECK(llegada>salida AND liberacion_bus>=llegada),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
EXCLUDE USING gist(bus_id WITH =, tstzrange(salida,liberacion_bus,'[)') WITH &&) WHERE(estado<>'CANCELADO')
);
CREATE TABLE transporte.bancos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre varchar(150) NOT NULL, activo boolean NOT NULL DEFAULT true,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.cuentas_bancarias (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
banco_id uuid NOT NULL REFERENCES transporte.bancos(id), tipo text NOT NULL CHECK(tipo IN('CORRIENTE','AHORROS')), numero varchar(50) NOT NULL CHECK(length(trim(numero))>0), titular varchar(200) NOT NULL, documento_titular varchar(30) NOT NULL, alias varchar(100), qr_archivo_id uuid REFERENCES transporte.archivos(id), activa boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id,banco_id,tipo,numero)
);
CREATE TABLE transporte.metodos_pago (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL, tipo text NOT NULL CHECK(tipo IN('MANUAL','EFECTIVO','PASARELA')), adaptador_disponible boolean NOT NULL DEFAULT false,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.cooperativa_metodos_pago (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
metodo_id uuid NOT NULL REFERENCES transporte.metodos_pago(id), habilitado boolean NOT NULL DEFAULT false, conexion_verificada boolean NOT NULL DEFAULT false, instrucciones text, secreto_ref text, plazo_oficina_minutos integer CHECK(plazo_oficina_minutos>0),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id,metodo_id)
);
CREATE TABLE transporte.politica_comprobantes (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
max_bytes bigint NOT NULL DEFAULT 5242880 CHECK(max_bytes BETWEEN 1024 AND 52428800), mimes text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','application/pdf'], referencia_obligatoria boolean NOT NULL DEFAULT false, prorroga_revision_minutos integer NOT NULL DEFAULT 0 CHECK(prorroga_revision_minutos=0),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id)
);
CREATE TABLE transporte.impuestos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL, puntos_base integer NOT NULL CHECK(puntos_base BETWEEN 0 AND 10000), concepto text NOT NULL CHECK(concepto IN('TRANSPORTE_TERRESTRE','SERVICIO_ADICIONAL')), activo boolean NOT NULL DEFAULT true,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.beneficios (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
codigo text NOT NULL CHECK(codigo IN('NINO','TERCERA_EDAD','DISCAPACIDAD')), nombre text NOT NULL, descuento_bp integer CHECK(descuento_bp BETWEEN 0 AND 10000), edad_min integer CHECK(edad_min>=0), edad_max_exclusiva integer CHECK(edad_max_exclusiva>0), condiciones text, activo boolean NOT NULL DEFAULT false, vigencia daterange NOT NULL DEFAULT daterange(current_date,NULL,'[)'), CHECK(NOT activo OR(descuento_bp IS NOT NULL AND length(trim(condiciones))>0)),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
EXCLUDE USING gist(cooperativa_id WITH =,codigo WITH =,vigencia WITH &&) WHERE(activo)
);
CREATE TABLE transporte.tarifas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
frecuencia_id uuid NOT NULL, grupo_id uuid NOT NULL, clase_id uuid NOT NULL REFERENCES transporte.clases_asiento(id), origen_orden integer NOT NULL, destino_orden integer NOT NULL, precio_centavos bigint NOT NULL CHECK(precio_centavos BETWEEN 0 AND 1000000000000), servicio_centavos bigint NOT NULL DEFAULT 0 CHECK(servicio_centavos BETWEEN 0 AND 1000000000000), impuesto_id uuid NOT NULL REFERENCES transporte.impuestos(id), impuesto_servicio_id uuid REFERENCES transporte.impuestos(id), vigencia daterange NOT NULL, activa boolean NOT NULL DEFAULT true, FOREIGN KEY(cooperativa_id,frecuencia_id) REFERENCES transporte.frecuencias(cooperativa_id,id), FOREIGN KEY(cooperativa_id,grupo_id) REFERENCES transporte.grupos_bus(cooperativa_id,id), CHECK(destino_orden>origen_orden AND origen_orden>=0), CHECK(servicio_centavos=0 OR impuesto_servicio_id IS NOT NULL),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
EXCLUDE USING gist(frecuencia_id WITH =,grupo_id WITH =,clase_id WITH =,origen_orden WITH =,destino_orden WITH =,vigencia WITH &&) WHERE(activa)
);
CREATE TABLE transporte.politicas_reembolso (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
numero_version integer NOT NULL CHECK(numero_version>0), estado text NOT NULL DEFAULT 'BORRADOR' CHECK(estado IN('BORRADOR','PUBLICADA','RETIRADA')), condiciones text, plazo_abono_dias integer CHECK(plazo_abono_dias>0), permite_parcial boolean NOT NULL DEFAULT false CHECK(NOT permite_parcial), publicada_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
UNIQUE(cooperativa_id,numero_version)
);
CREATE UNIQUE INDEX una_politica_publicada ON transporte.politicas_reembolso(cooperativa_id) WHERE estado='PUBLICADA';
CREATE TABLE transporte.reglas_reembolso (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
politica_id uuid NOT NULL, minutos_desde integer NOT NULL CHECK(minutos_desde>=0), minutos_hasta integer, porcentaje_bp integer NOT NULL CHECK(porcentaje_bp BETWEEN 0 AND 10000), FOREIGN KEY(cooperativa_id,politica_id) REFERENCES transporte.politicas_reembolso(cooperativa_id,id), CHECK(minutos_hasta IS NULL OR minutos_hasta>minutos_desde),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
EXCLUDE USING gist(politica_id WITH =,int4range(minutos_desde,minutos_hasta,'[)') WITH &&)
);
CREATE TABLE transporte.reservas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
cliente_id uuid NOT NULL REFERENCES transporte.usuarios(id), viaje_id uuid NOT NULL, oficina_id uuid, origen_orden integer NOT NULL, destino_orden integer NOT NULL, cantidad integer NOT NULL CHECK(cantidad BETWEEN 1 AND 50), estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN('PENDIENTE','CONFIRMADA','VENCIDA','CANCELADA')), expires_at timestamptz NOT NULL, contacto_email varchar(254), contacto_telefono varchar(25), cotizacion_version integer NOT NULL DEFAULT 0, aceptada_version integer, total_centavos bigint NOT NULL DEFAULT 0 CHECK(total_centavos>=0), FOREIGN KEY(cooperativa_id,viaje_id) REFERENCES transporte.viajes(cooperativa_id,id), FOREIGN KEY(cooperativa_id,oficina_id) REFERENCES transporte.oficinas(cooperativa_id,id), CHECK(origen_orden>=0 AND destino_orden>origen_orden), UNIQUE(cooperativa_id,id,viaje_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.reserva_asientos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
reserva_id uuid NOT NULL, viaje_id uuid NOT NULL, asiento_id uuid NOT NULL, origen_orden integer NOT NULL, destino_orden integer NOT NULL, estado text NOT NULL DEFAULT 'RETENIDO' CHECK(estado IN('RETENIDO','CONFIRMADO','LIBERADO')), expires_at timestamptz NOT NULL, FOREIGN KEY(cooperativa_id,reserva_id,viaje_id) REFERENCES transporte.reservas(cooperativa_id,id,viaje_id), FOREIGN KEY(cooperativa_id,asiento_id) REFERENCES transporte.plano_celdas(cooperativa_id,id), CHECK(destino_orden>origen_orden AND origen_orden>=0), UNIQUE(reserva_id,asiento_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id),
EXCLUDE USING gist(viaje_id WITH =,asiento_id WITH =,int4range(origen_orden,destino_orden,'[)') WITH &&) WHERE(estado IN('RETENIDO','CONFIRMADO'))
);
CREATE TABLE transporte.pasajeros (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
reserva_asiento_id uuid NOT NULL UNIQUE, nombres varchar(100) NOT NULL, apellidos varchar(100) NOT NULL, tipo_documento text NOT NULL CHECK(tipo_documento IN('CEDULA','PASAPORTE','OTRO')), documento varchar(30) NOT NULL, nacimiento date, beneficio_codigo text CHECK(beneficio_codigo IN('NINO','TERCERA_EDAD','DISCAPACIDAD')), respaldo_archivo_id uuid REFERENCES transporte.archivos(id), FOREIGN KEY(cooperativa_id,reserva_asiento_id) REFERENCES transporte.reserva_asientos(cooperativa_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.cotizaciones (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
reserva_id uuid NOT NULL, version integer NOT NULL, moneda char(3) NOT NULL DEFAULT 'USD' CHECK(moneda='USD'), base_centavos bigint NOT NULL, descuento_centavos bigint NOT NULL, servicio_centavos bigint NOT NULL, subtotal_neto_centavos bigint NOT NULL, iva_centavos bigint NOT NULL, total_centavos bigint NOT NULL, FOREIGN KEY(cooperativa_id,reserva_id) REFERENCES transporte.reservas(cooperativa_id,id), UNIQUE(reserva_id,version), CHECK(base_centavos>=descuento_centavos AND descuento_centavos>=0 AND servicio_centavos>=0 AND iva_centavos>=0), CHECK(subtotal_neto_centavos=base_centavos-descuento_centavos+servicio_centavos AND total_centavos=subtotal_neto_centavos+iva_centavos),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.cotizacion_lineas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
cotizacion_id uuid NOT NULL, reserva_asiento_id uuid NOT NULL, tarifa_id uuid NOT NULL, beneficio_id uuid, base_centavos bigint NOT NULL, descuento_centavos bigint NOT NULL, servicio_centavos bigint NOT NULL, impuesto_bp integer NOT NULL, impuesto_servicio_bp integer NOT NULL, iva_centavos bigint NOT NULL, FOREIGN KEY(cooperativa_id,cotizacion_id) REFERENCES transporte.cotizaciones(cooperativa_id,id), FOREIGN KEY(cooperativa_id,reserva_asiento_id) REFERENCES transporte.reserva_asientos(cooperativa_id,id), FOREIGN KEY(cooperativa_id,tarifa_id) REFERENCES transporte.tarifas(cooperativa_id,id), FOREIGN KEY(cooperativa_id,beneficio_id) REFERENCES transporte.beneficios(cooperativa_id,id), CHECK(base_centavos>=descuento_centavos AND descuento_centavos>=0 AND servicio_centavos>=0 AND iva_centavos>=0), UNIQUE(cotizacion_id,reserva_asiento_id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.intentos_pago (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
reserva_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES transporte.usuarios(id), metodo_id uuid NOT NULL REFERENCES transporte.metodos_pago(id), cuenta_id uuid, cuenta_snapshot jsonb, clave_intento varchar(120) NOT NULL, estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN('PENDIENTE','EN_REVISION','APROBADO','RECHAZADO','ANULADO')), total_centavos bigint NOT NULL CHECK(total_centavos>=0), cotizacion_version integer NOT NULL, proveedor_orden varchar(200), FOREIGN KEY(cooperativa_id,reserva_id) REFERENCES transporte.reservas(cooperativa_id,id), FOREIGN KEY(cooperativa_id,cuenta_id) REFERENCES transporte.cuentas_bancarias(cooperativa_id,id), UNIQUE(actor_id,clave_intento),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE UNIQUE INDEX un_intento_pendiente ON transporte.intentos_pago(reserva_id) WHERE estado IN('PENDIENTE','EN_REVISION','APROBADO');
CREATE TABLE transporte.comprobantes (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
intento_id uuid NOT NULL UNIQUE, archivo_id uuid NOT NULL UNIQUE REFERENCES transporte.archivos(id), referencia varchar(120), estado text NOT NULL DEFAULT 'EN_REVISION' CHECK(estado IN('EN_REVISION','APROBADO','RECHAZADO')), motivo varchar(300), revisado_por uuid REFERENCES transporte.usuarios(id), revisado_at timestamptz, version integer NOT NULL DEFAULT 1, FOREIGN KEY(cooperativa_id,intento_id) REFERENCES transporte.intentos_pago(cooperativa_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.pagos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
reserva_id uuid NOT NULL UNIQUE, intento_id uuid NOT NULL UNIQUE, monto_centavos bigint NOT NULL CHECK(monto_centavos>=0), recibido_centavos bigint, cambio_centavos bigint, confirmado_por uuid REFERENCES transporte.usuarios(id), confirmado_at timestamptz NOT NULL DEFAULT now(), referencia_externa text, FOREIGN KEY(cooperativa_id,reserva_id) REFERENCES transporte.reservas(cooperativa_id,id), FOREIGN KEY(cooperativa_id,intento_id) REFERENCES transporte.intentos_pago(cooperativa_id,id), CHECK(recibido_centavos IS NULL OR(recibido_centavos>=monto_centavos AND cambio_centavos=recibido_centavos-monto_centavos)),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.compras (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
reserva_id uuid NOT NULL UNIQUE, pago_id uuid NOT NULL UNIQUE, codigo uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, politica_reembolso_id uuid, estado text NOT NULL DEFAULT 'CONFIRMADA' CHECK(estado IN('CONFIRMADA','CANCELADA','REEMBOLSADA')), viaje_snapshot jsonb NOT NULL, total_pagado_centavos bigint NOT NULL CHECK(total_pagado_centavos>=0), FOREIGN KEY(cooperativa_id,reserva_id) REFERENCES transporte.reservas(cooperativa_id,id), FOREIGN KEY(cooperativa_id,pago_id) REFERENCES transporte.pagos(cooperativa_id,id), FOREIGN KEY(cooperativa_id,politica_reembolso_id) REFERENCES transporte.politicas_reembolso(cooperativa_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.boletos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
compra_id uuid NOT NULL UNIQUE, qr_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, estado text NOT NULL DEFAULT 'PENDIENTE_EMISION' CHECK(estado IN('PENDIENTE_EMISION','LISTO','ERROR','ANULADO')), archivo_id uuid REFERENCES transporte.archivos(id), emitido_at timestamptz, FOREIGN KEY(cooperativa_id,compra_id) REFERENCES transporte.compras(cooperativa_id,id), CHECK(estado<>'LISTO' OR(archivo_id IS NOT NULL AND emitido_at IS NOT NULL)),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.notificaciones (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid REFERENCES transporte.usuarios(id), cooperativa_id uuid REFERENCES transporte.cooperativas(id), tipo text NOT NULL, canal text NOT NULL CHECK(canal IN('APP','EMAIL','WHATSAPP')), evento_clave text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN('PENDIENTE','EN_PROCESO','ENVIADA','FALLIDA')), intentos integer NOT NULL DEFAULT 0, disponible_at timestamptz NOT NULL DEFAULT now(), leida_at timestamptz, proveedor_ref text, error_codigo text, UNIQUE(evento_clave,canal),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.solicitudes_reembolso (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
compra_id uuid NOT NULL, solicitado_por uuid NOT NULL REFERENCES transporte.usuarios(id), politica_id uuid NOT NULL, regla_id uuid NOT NULL, porcentaje_bp integer NOT NULL, monto_centavos bigint NOT NULL CHECK(monto_centavos>=0), motivo varchar(500) NOT NULL, estado text NOT NULL DEFAULT 'SOLICITADO' CHECK(estado IN('SOLICITADO','APROBADO','RECHAZADO','EJECUTADO')), decision_motivo text, decidido_por uuid REFERENCES transporte.usuarios(id), decidido_at timestamptz, clave_intento varchar(120) NOT NULL, FOREIGN KEY(cooperativa_id,compra_id) REFERENCES transporte.compras(cooperativa_id,id), FOREIGN KEY(cooperativa_id,politica_id) REFERENCES transporte.politicas_reembolso(cooperativa_id,id), FOREIGN KEY(cooperativa_id,regla_id) REFERENCES transporte.reglas_reembolso(cooperativa_id,id), UNIQUE(solicitado_por,clave_intento),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE UNIQUE INDEX reembolso_activo ON transporte.solicitudes_reembolso(compra_id) WHERE estado IN('SOLICITADO','APROBADO','EJECUTADO');
CREATE TABLE transporte.reembolsos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
solicitud_id uuid NOT NULL UNIQUE, pago_id uuid NOT NULL, monto_centavos bigint NOT NULL CHECK(monto_centavos>=0), ejecutado_por uuid NOT NULL REFERENCES transporte.usuarios(id), referencia_externa varchar(200) NOT NULL CHECK(length(trim(referencia_externa))>0), evidencia_archivo_id uuid REFERENCES transporte.archivos(id), clave_intento varchar(120) NOT NULL UNIQUE, ejecutado_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(cooperativa_id,solicitud_id) REFERENCES transporte.solicitudes_reembolso(cooperativa_id,id), FOREIGN KEY(cooperativa_id,pago_id) REFERENCES transporte.pagos(cooperativa_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.abordajes (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
compra_id uuid NOT NULL, reserva_asiento_id uuid NOT NULL UNIQUE, operador_id uuid NOT NULL REFERENCES transporte.usuarios(id), escaneado_at timestamptz NOT NULL DEFAULT now(), clave_intento varchar(120) NOT NULL UNIQUE, FOREIGN KEY(cooperativa_id,compra_id) REFERENCES transporte.compras(cooperativa_id,id), FOREIGN KEY(cooperativa_id,reserva_asiento_id) REFERENCES transporte.reserva_asientos(cooperativa_id,id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE(cooperativa_id,id)
);
CREATE TABLE transporte.auditoria (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
actor_id uuid REFERENCES transporte.usuarios(id), cooperativa_id uuid REFERENCES transporte.cooperativas(id), entidad text NOT NULL, entidad_id uuid, accion text NOT NULL, request_id text, datos jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.contactos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre varchar(150) NOT NULL, email varchar(254) NOT NULL, asunto varchar(150) NOT NULL, mensaje varchar(4000) NOT NULL, consentimiento_version varchar(100) NOT NULL, estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN('PENDIENTE','EN_ATENCION','RESUELTO')), cooperativa_id uuid REFERENCES transporte.cooperativas(id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transporte.exportaciones (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
solicitado_por uuid NOT NULL REFERENCES transporte.usuarios(id), cooperativa_id uuid REFERENCES transporte.cooperativas(id), tipo text NOT NULL, filtros jsonb NOT NULL DEFAULT '{}'::jsonb, estado text NOT NULL DEFAULT 'PENDIENTE', archivo_id uuid REFERENCES transporte.archivos(id),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX viajes_bus_fecha ON transporte.viajes(bus_id,salida);
CREATE INDEX viajes_publicados ON transporte.viajes(frecuencia_id,salida) WHERE estado='PUBLICADO';
CREATE INDEX reservas_cliente_fecha ON transporte.reservas(cliente_id,created_at DESC);
CREATE INDEX reservas_expirar ON transporte.reservas(expires_at) WHERE estado='PENDIENTE';
CREATE INDEX cola_comprobantes ON transporte.comprobantes(cooperativa_id,estado,created_at);
CREATE INDEX cola_reembolsos ON transporte.solicitudes_reembolso(cooperativa_id,estado,created_at);
CREATE INDEX notificaciones_pendientes ON transporte.notificaciones(disponible_at) WHERE estado='PENDIENTE';
CREATE INDEX auditoria_ambito_fecha ON transporte.auditoria(cooperativa_id,created_at DESC);
CREATE INDEX pasajero_documento ON transporte.pasajeros(tipo_documento,documento);
CREATE INDEX oficinas_coop_idx ON transporte.oficinas(cooperativa_id);
CREATE INDEX membresias_coop_idx ON transporte.membresias(cooperativa_id);
CREATE INDEX config_cooperativa_coop_idx ON transporte.config_cooperativa(cooperativa_id);
CREATE INDEX rutas_coop_idx ON transporte.rutas(cooperativa_id);
CREATE INDEX ruta_paradas_coop_idx ON transporte.ruta_paradas(cooperativa_id);
CREATE INDEX grupos_bus_coop_idx ON transporte.grupos_bus(cooperativa_id);
CREATE INDEX grupo_dias_parada_coop_idx ON transporte.grupo_dias_parada(cooperativa_id);
CREATE INDEX grupo_turnos_coop_idx ON transporte.grupo_turnos(cooperativa_id);
CREATE INDEX frecuencias_coop_idx ON transporte.frecuencias(cooperativa_id);
CREATE INDEX frecuencia_grupo_coop_idx ON transporte.frecuencia_grupo(cooperativa_id);
CREATE INDEX buses_coop_idx ON transporte.buses(cooperativa_id);
CREATE INDEX bus_equipamiento_coop_idx ON transporte.bus_equipamiento(cooperativa_id);
CREATE INDEX bus_fotos_coop_idx ON transporte.bus_fotos(cooperativa_id);
CREATE INDEX planos_coop_idx ON transporte.planos(cooperativa_id);
CREATE INDEX plano_celdas_coop_idx ON transporte.plano_celdas(cooperativa_id);
CREATE INDEX indisponibilidades_bus_coop_idx ON transporte.indisponibilidades_bus(cooperativa_id);
CREATE INDEX viajes_coop_idx ON transporte.viajes(cooperativa_id);
CREATE INDEX cuentas_bancarias_coop_idx ON transporte.cuentas_bancarias(cooperativa_id);
CREATE INDEX cooperativa_metodos_pago_coop_idx ON transporte.cooperativa_metodos_pago(cooperativa_id);
CREATE INDEX politica_comprobantes_coop_idx ON transporte.politica_comprobantes(cooperativa_id);
CREATE INDEX beneficios_coop_idx ON transporte.beneficios(cooperativa_id);
CREATE INDEX tarifas_coop_idx ON transporte.tarifas(cooperativa_id);
CREATE INDEX politicas_reembolso_coop_idx ON transporte.politicas_reembolso(cooperativa_id);
CREATE INDEX reglas_reembolso_coop_idx ON transporte.reglas_reembolso(cooperativa_id);
CREATE INDEX reservas_coop_idx ON transporte.reservas(cooperativa_id);
CREATE INDEX reserva_asientos_coop_idx ON transporte.reserva_asientos(cooperativa_id);
CREATE INDEX pasajeros_coop_idx ON transporte.pasajeros(cooperativa_id);
CREATE INDEX cotizaciones_coop_idx ON transporte.cotizaciones(cooperativa_id);
CREATE INDEX cotizacion_lineas_coop_idx ON transporte.cotizacion_lineas(cooperativa_id);
CREATE INDEX intentos_pago_coop_idx ON transporte.intentos_pago(cooperativa_id);
CREATE INDEX comprobantes_coop_idx ON transporte.comprobantes(cooperativa_id);
CREATE INDEX pagos_coop_idx ON transporte.pagos(cooperativa_id);
CREATE INDEX compras_coop_idx ON transporte.compras(cooperativa_id);
CREATE INDEX boletos_coop_idx ON transporte.boletos(cooperativa_id);
CREATE INDEX solicitudes_reembolso_coop_idx ON transporte.solicitudes_reembolso(cooperativa_id);
CREATE INDEX reembolsos_coop_idx ON transporte.reembolsos(cooperativa_id);
CREATE INDEX abordajes_coop_idx ON transporte.abordajes(cooperativa_id);

-- Catálogos técnicos. Sin cuentas reales, sin credenciales y sin descuentos inventados.
INSERT INTO transporte.schema_version(version,descripcion) VALUES('1.0.0','Base inicial para43 referencias aprobadas');
INSERT INTO transporte.roles(codigo,nombre,ambito) VALUES
('ADMIN_SISTEMA','Administrador del sistema','GLOBAL'),('COOPERATIVA','Administrador de cooperativa','COOPERATIVA'),('OFICINISTA','Oficinista','COOPERATIVA'),('PERSONAL_BUS','Personal del bus','COOPERATIVA'),('CLIENTE','Cliente','CLIENTE');
INSERT INTO transporte.permisos(codigo,descripcion) VALUES
('identidad.admin','Administrar identidades y roles globales'),('cooperativas.admin','Administrar cooperativas globalmente'),('config.global','Administrar parámetros globales'),('cooperativa.leer','Consultar operación del ámbito'),('flota.admin','Editar flota y grupos'),('operacion.admin','Frecuencias y publicación'),('tarifas.admin','Tarifas impuestos beneficios y políticas'),('config.admin','Identidad y configuración de cooperativa'),('pagos.configurar','Cuentas y métodos'),('oficina.vender','Venta asistida'),('pagos.revisar','Revisar comprobantes'),('reembolsos.gestionar','Resolver y registrar reembolsos'),('reportes.leer','Consultar reportes de su ámbito'),('auditoria.leer','Consultar auditoría'),('abordaje.registrar','Validar acceso por pasajero');
INSERT INTO transporte.rol_permiso(rol_id,permiso_id)
SELECT r.id,p.id FROM transporte.roles r CROSS JOIN transporte.permisos p WHERE
r.codigo='ADMIN_SISTEMA' OR
(r.codigo='COOPERATIVA' AND p.codigo NOT IN('identidad.admin','cooperativas.admin','config.global')) OR
(r.codigo='OFICINISTA' AND p.codigo IN('cooperativa.leer','oficina.vender','pagos.revisar','reembolsos.gestionar','reportes.leer')) OR
(r.codigo='PERSONAL_BUS' AND p.codigo IN('cooperativa.leer','abordaje.registrar'));
INSERT INTO transporte.clases_asiento(codigo,nombre) VALUES('NORMAL','Normal'),('VIP','VIP');
INSERT INTO transporte.equipamientos(codigo,nombre) VALUES('WIFI','WiFi'),('BANO','Baño'),('AIRE','Climatización'),('USB','Enchufes USB'),('PANTALLA','Pantallas'),('ENTRETENIMIENTO','Entretenimiento'),('RECLINABLE','Asiento reclinable'),('MALETERO','Maletero');
INSERT INTO transporte.metodos_pago(codigo,nombre,tipo,adaptador_disponible) VALUES
('BANCO','Transferencia/Depósito','MANUAL',true),('EFECTIVO','Pago en oficina','EFECTIVO',true),('PAYPHONE','PayPhone','PASARELA',false),('TARJETA','Tarjeta de crédito/débito','PASARELA',false),('PAYPAL','PayPal','PASARELA',false);
INSERT INTO transporte.bancos(codigo,nombre) VALUES('PICHINCHA','Banco Pichincha'),('GUAYAQUIL','Banco Guayaquil'),('PRODUBANCO','Produbanco'),('PACIFICO','Banco del Pacífico'),('MACHALA','Banco de Machala'),('BOLIVARIANO','Banco Bolivariano'),('INTERNACIONAL','Banco Internacional'),('AUSTRO','Banco del Austro');
INSERT INTO transporte.impuestos(codigo,nombre,puntos_base,concepto) VALUES('IVA0_TRANSPORTE','IVA0% transporte nacional terrestre',0,'TRANSPORTE_TERRESTRE'),('IVA0_SERVICIO','IVA0% servicio adicional - validar aplicación',0,'SERVICIO_ADICIONAL'),('IVA15_SERVICIO','IVA15% servicio adicional - solo si corresponde',1500,'SERVICIO_ADICIONAL');
INSERT INTO transporte.ciudades(nombre,provincia) VALUES('Quito','Pichincha'),('Guayaquil','Guayas'),('Ambato','Tungurahua'),('Cuenca','Azuay'),('Loja','Loja'),('Latacunga','Cotopaxi'),('Riobamba','Chimborazo');
INSERT INTO transporte.config_global(clave,valor) VALUES
('retencion_minutos','15'),('limite_pasajeros','10'),('zona_horaria','"America/Guayaquil"'),('moneda','"USD"'),('revision_sin_prorroga','true');

-- Funciones del backend. SECURITY DEFINER usa rutas fijas; permisos se conceden al final.
CREATE FUNCTION transporte.actor() RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT nullif(current_setting('app.usuario_id',true),'')::uuid $$;

CREATE FUNCTION transporte.puede(p_permiso text,p_coop uuid DEFAULT NULL,p_oficina uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM transporte.usuarios u WHERE u.id=transporte.actor() AND u.activo) AND (
 EXISTS(SELECT 1 FROM transporte.usuario_roles_globales ur JOIN transporte.roles r ON r.id=ur.rol_id JOIN transporte.rol_permiso rp ON rp.rol_id=r.id JOIN transporte.permisos p ON p.id=rp.permiso_id WHERE ur.usuario_id=transporte.actor() AND r.ambito='GLOBAL' AND p.codigo=p_permiso)
 OR(p_coop IS NOT NULL AND EXISTS(SELECT 1 FROM transporte.membresias m JOIN transporte.roles r ON r.id=m.rol_id JOIN transporte.rol_permiso rp ON rp.rol_id=r.id JOIN transporte.permisos p ON p.id=rp.permiso_id WHERE m.usuario_id=transporte.actor() AND m.activa AND m.cooperativa_id=p_coop AND r.ambito='COOPERATIVA' AND p.codigo=p_permiso AND(p_oficina IS NULL OR m.oficina_id IS NULL OR m.oficina_id=p_oficina)))) $$;

CREATE FUNCTION transporte.exigir(p_permiso text,p_coop uuid DEFAULT NULL,p_oficina uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
BEGIN IF NOT transporte.puede(p_permiso,p_coop,p_oficina) THEN RAISE EXCEPTION 'Sin permiso: %',p_permiso USING ERRCODE='42501'; END IF; END $$;

CREATE FUNCTION transporte.abrir_contexto(p_token_hash text,p_request_id text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE uid uuid;
BEGIN
 SELECT u.id INTO uid FROM transporte.sesiones s JOIN transporte.usuarios u ON u.id=s.usuario_id WHERE s.token_hash=p_token_hash AND s.expires_at>now() AND s.revocada_at IS NULL AND u.activo;
 IF uid IS NULL THEN RAISE EXCEPTION 'Sesion ausente, revocada o vencida' USING ERRCODE='28000'; END IF;
 PERFORM set_config('app.usuario_id',uid::text,true); PERFORM set_config('app.request_id',coalesce(p_request_id,''),true); RETURN uid;
END $$;

-- Solo para el servicio de autenticación: comprobar la contraseña en Node con scrypt.
CREATE FUNCTION transporte.credencial_login(p_email text) RETURNS TABLE(usuario_id uuid,password_hash text,activo boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT u.id,c.password_hash,u.activo FROM transporte.usuarios u JOIN transporte.credenciales c ON c.usuario_id=u.id WHERE lower(u.email)=lower(trim(p_email)) $$;

CREATE FUNCTION transporte.registrar_cliente(p_nombres text,p_apellidos text,p_tipo text,p_documento text,p_email text,p_telefono text,p_hash text,p_terminos text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE uid uuid;
BEGIN
 IF length(trim(coalesce(p_terminos,'')))=0 OR p_hash NOT LIKE 'scrypt-v1$%' THEN RAISE EXCEPTION 'Terminos o hash no validos'; END IF;
 IF p_tipo='CEDULA' AND p_documento !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'Cedula debe contener10 digitos; validar ademas el digito de control en API'; END IF;
 INSERT INTO transporte.usuarios(nombres,apellidos,tipo_documento,documento,email,telefono) VALUES(trim(p_nombres),trim(p_apellidos),p_tipo,trim(p_documento),lower(trim(p_email)),p_telefono) RETURNING id INTO uid;
 INSERT INTO transporte.credenciales(usuario_id,password_hash) VALUES(uid,p_hash);
 INSERT INTO transporte.consentimientos(usuario_id,tipo,version) VALUES(uid,'TERMINOS_PRIVACIDAD',p_terminos);
 INSERT INTO transporte.notificaciones(usuario_id,tipo,canal,evento_clave,payload) VALUES(uid,'ALTA_CLIENTE','APP','alta:'||uid,jsonb_build_object('usuarioId',uid));
 RETURN uid;
END $$;

CREATE FUNCTION transporte.emitir_sesion_autenticada(p_usuario uuid,p_token_hash text,p_expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE sid uuid;
BEGIN
 -- El servicio Node solo la llama DESPUES de verificar el hash de contraseña.
 IF NOT EXISTS(SELECT 1 FROM transporte.usuarios WHERE id=p_usuario AND activo) OR p_expires<=now() OR p_expires>now()+interval '30 days' THEN RAISE EXCEPTION 'Sesion invalida'; END IF;
 INSERT INTO transporte.sesiones(usuario_id,token_hash,expires_at) VALUES(p_usuario,p_token_hash,p_expires) RETURNING id INTO sid; RETURN sid;
END $$;

CREATE FUNCTION transporte.reserva_autorizada(p_id uuid) RETURNS transporte.reservas LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas;
BEGIN
 SELECT * INTO r FROM transporte.reservas WHERE id=p_id;
 IF r.id IS NULL OR transporte.actor() IS NULL OR NOT(r.cliente_id=transporte.actor() OR transporte.puede('oficina.vender',r.cooperativa_id,r.oficina_id) OR transporte.puede('pagos.revisar',r.cooperativa_id,r.oficina_id) OR transporte.puede('reembolsos.gestionar',r.cooperativa_id,r.oficina_id)) THEN RAISE EXCEPTION 'Reserva no accesible' USING ERRCODE='42501'; END IF; RETURN r;
END $$;

CREATE FUNCTION transporte.expirar_reservas(p_viaje uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE n integer;
BEGIN
 PERFORM 1 FROM transporte.viajes WHERE id=p_viaje FOR UPDATE;
 UPDATE transporte.reservas SET estado='VENCIDA' WHERE viaje_id=p_viaje AND estado='PENDIENTE' AND expires_at<=now(); GET DIAGNOSTICS n=ROW_COUNT;
 UPDATE transporte.reserva_asientos a SET estado='LIBERADO' FROM transporte.reservas r WHERE a.reserva_id=r.id AND r.viaje_id=p_viaje AND r.estado IN('VENCIDA','CANCELADA') AND a.estado='RETENIDO';
 UPDATE transporte.intentos_pago i SET estado='ANULADO' FROM transporte.reservas r WHERE i.reserva_id=r.id AND r.viaje_id=p_viaje AND r.estado='VENCIDA' AND i.estado='PENDIENTE';
 RETURN n;
END $$;

CREATE FUNCTION transporte.reservar_asientos(p_viaje uuid,p_origen integer,p_destino integer,p_asientos uuid[],p_cliente uuid DEFAULT NULL,p_oficina uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE v transporte.viajes; f transporte.frecuencias; rid uuid; uid uuid:=coalesce(p_cliente,transporte.actor()); n integer; fin timestamptz; lim integer;
BEGIN
 IF transporte.actor() IS NULL THEN RAISE EXCEPTION 'Inicie sesion' USING ERRCODE='28000'; END IF;
 SELECT * INTO v FROM transporte.viajes WHERE id=p_viaje FOR UPDATE;
 IF v.id IS NULL OR v.estado<>'PUBLICADO' OR v.salida<=now() THEN RAISE EXCEPTION 'Viaje no vendible'; END IF;
 IF uid<>transporte.actor() OR p_oficina IS NOT NULL THEN PERFORM transporte.exigir('oficina.vender',v.cooperativa_id,p_oficina); END IF;
 SELECT * INTO f FROM transporte.frecuencias WHERE id=v.frecuencia_id;
 IF NOT f.activa THEN RAISE EXCEPTION 'Frecuencia inactiva'; END IF;
 SELECT count(DISTINCT a) INTO n FROM unnest(p_asientos) a;
 SELECT (valor#>>'{}')::integer INTO lim FROM transporte.config_global WHERE clave='limite_pasajeros';
 IF n=0 OR n<>cardinality(p_asientos) OR n>lim THEN RAISE EXCEPTION 'Cantidad o IDs de asiento invalidos'; END IF;
 IF p_origen>=p_destino OR NOT EXISTS(SELECT 1 FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id AND orden=p_origen) OR NOT EXISTS(SELECT 1 FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id AND orden=p_destino) THEN RAISE EXCEPTION 'Tramo no valido'; END IF;
 IF f.tipo_viaje='DIRECTO' AND(p_origen<>(SELECT min(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id) OR p_destino<>(SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id)) THEN RAISE EXCEPTION 'Viaje directo no vende intermedias'; END IF;
 IF(SELECT count(*) FROM transporte.plano_celdas WHERE id=ANY(p_asientos) AND plano_id=v.plano_id AND tipo='ASIENTO' AND activa)<>n THEN RAISE EXCEPTION 'Asiento ajeno al plano o no vendible'; END IF;
 PERFORM transporte.expirar_reservas(v.id);
 SELECT least(v.salida,now()+make_interval(mins=>(valor#>>'{}')::integer)) INTO fin FROM transporte.config_global WHERE clave='retencion_minutos';
 INSERT INTO transporte.reservas(cooperativa_id,cliente_id,viaje_id,oficina_id,origen_orden,destino_orden,cantidad,expires_at) VALUES(v.cooperativa_id,uid,v.id,p_oficina,p_origen,p_destino,n,fin) RETURNING id INTO rid;
 INSERT INTO transporte.reserva_asientos(cooperativa_id,reserva_id,viaje_id,asiento_id,origen_orden,destino_orden,expires_at) SELECT v.cooperativa_id,rid,v.id,a,p_origen,p_destino,fin FROM unnest(p_asientos) a;
 RETURN rid;
END $$;

CREATE FUNCTION transporte.guardar_pasajero(p_asiento_reserva uuid,p_datos jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE a transporte.reserva_asientos; r transporte.reservas; pid uuid;
BEGIN
 SELECT * INTO a FROM transporte.reserva_asientos WHERE id=p_asiento_reserva; r:=transporte.reserva_autorizada(a.reserva_id);
 PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id=r.id AND estado<>'ANULADO') THEN RAISE EXCEPTION 'Reserva no editable; resuelva o anule el intento antes'; END IF;
 IF p_datos->>'nacimiento' IS NOT NULL AND(p_datos->>'nacimiento')::date>current_date THEN RAISE EXCEPTION 'Nacimiento futuro'; END IF;
 INSERT INTO transporte.pasajeros(cooperativa_id,reserva_asiento_id,nombres,apellidos,tipo_documento,documento,nacimiento,beneficio_codigo,respaldo_archivo_id)
 VALUES(r.cooperativa_id,a.id,trim(p_datos->>'nombres'),trim(p_datos->>'apellidos'),p_datos->>'tipoDocumento',p_datos->>'documento',nullif(p_datos->>'nacimiento','')::date,nullif(p_datos->>'beneficio',''),nullif(p_datos->>'respaldoArchivoId','')::uuid)
 ON CONFLICT(reserva_asiento_id) DO UPDATE SET nombres=excluded.nombres,apellidos=excluded.apellidos,tipo_documento=excluded.tipo_documento,documento=excluded.documento,nacimiento=excluded.nacimiento,beneficio_codigo=excluded.beneficio_codigo,respaldo_archivo_id=excluded.respaldo_archivo_id RETURNING id INTO pid;
 UPDATE transporte.reservas SET aceptada_version=NULL WHERE id=r.id; RETURN pid;
END $$;

CREATE FUNCTION transporte.cotizar(p_reserva uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; v transporte.viajes; bus transporte.buses; l record; t transporte.tarifas; b transporte.beneficios; imp integer; imp_s integer; edad integer; dto bigint; iva bigint; qid uuid; version_n integer;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva); PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id=r.id AND estado<>'ANULADO') THEN RAISE EXCEPTION 'No puede recotizar esta reserva'; END IF;
 IF(SELECT count(*) FROM transporte.pasajeros p JOIN transporte.reserva_asientos a ON a.id=p.reserva_asiento_id WHERE a.reserva_id=r.id)<>r.cantidad THEN RAISE EXCEPTION 'Complete un pasajero por asiento'; END IF;
 SELECT * INTO v FROM transporte.viajes WHERE id=r.viaje_id; SELECT * INTO bus FROM transporte.buses WHERE id=v.bus_id;
 SELECT coalesce(max(version),0)+1 INTO version_n FROM transporte.cotizaciones WHERE reserva_id=r.id;
 INSERT INTO transporte.cotizaciones(cooperativa_id,reserva_id,version,base_centavos,descuento_centavos,servicio_centavos,subtotal_neto_centavos,iva_centavos,total_centavos) VALUES(r.cooperativa_id,r.id,version_n,0,0,0,0,0,0) RETURNING id INTO qid;
 FOR l IN SELECT a.id,pc.clase_id,p.nacimiento,p.beneficio_codigo,p.respaldo_archivo_id FROM transporte.reserva_asientos a JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id JOIN transporte.pasajeros p ON p.reserva_asiento_id=a.id WHERE a.reserva_id=r.id AND a.estado='RETENIDO' LOOP
  SELECT * INTO t FROM transporte.tarifas WHERE frecuencia_id=v.frecuencia_id AND grupo_id=bus.grupo_id AND clase_id=l.clase_id AND origen_orden=r.origen_orden AND destino_orden=r.destino_orden AND activa AND vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Falta tarifa para tramo/clase/fecha'; END IF;
  b:=NULL; dto:=0;
  IF l.beneficio_codigo IS NOT NULL THEN
   SELECT * INTO b FROM transporte.beneficios WHERE cooperativa_id=r.cooperativa_id AND codigo=l.beneficio_codigo AND activo AND vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date;
   IF b.id IS NULL THEN RAISE EXCEPTION 'Beneficio no definido o inactivo'; END IF;
   edad:=extract(year FROM age((v.salida AT TIME ZONE 'America/Guayaquil')::date,l.nacimiento));
   IF (b.edad_min IS NOT NULL OR b.edad_max_exclusiva IS NOT NULL) AND(l.nacimiento IS NULL OR edad<coalesce(b.edad_min,0) OR edad>=coalesce(b.edad_max_exclusiva,1000)) THEN RAISE EXCEPTION 'Edad no elegible'; END IF;
   IF b.codigo='DISCAPACIDAD' AND l.respaldo_archivo_id IS NULL THEN RAISE EXCEPTION 'Falta respaldo de beneficio'; END IF;
   dto:=round(t.precio_centavos*b.descuento_bp/10000.0)::bigint;
  END IF;
  SELECT puntos_base INTO imp FROM transporte.impuestos WHERE id=t.impuesto_id AND activo;
  imp_s:=0; IF t.servicio_centavos>0 THEN SELECT puntos_base INTO imp_s FROM transporte.impuestos WHERE id=t.impuesto_servicio_id AND activo; END IF;
  IF imp IS NULL OR imp_s IS NULL THEN RAISE EXCEPTION 'Impuesto no definido'; END IF;
  iva:=round((t.precio_centavos-dto)*imp/10000.0)::bigint+round(t.servicio_centavos*imp_s/10000.0)::bigint;
  INSERT INTO transporte.cotizacion_lineas(cooperativa_id,cotizacion_id,reserva_asiento_id,tarifa_id,beneficio_id,base_centavos,descuento_centavos,servicio_centavos,impuesto_bp,impuesto_servicio_bp,iva_centavos) VALUES(r.cooperativa_id,qid,l.id,t.id,b.id,t.precio_centavos,dto,t.servicio_centavos,imp,imp_s,iva);
 END LOOP;
 UPDATE transporte.cotizaciones q SET base_centavos=z.base,descuento_centavos=z.dto,servicio_centavos=z.servicio,subtotal_neto_centavos=z.base-z.dto+z.servicio,iva_centavos=z.iva,total_centavos=z.base-z.dto+z.servicio+z.iva FROM(SELECT sum(base_centavos) base,sum(descuento_centavos) dto,sum(servicio_centavos) servicio,sum(iva_centavos) iva FROM transporte.cotizacion_lineas WHERE cotizacion_id=qid)z WHERE q.id=qid;
 UPDATE transporte.reservas SET cotizacion_version=version_n,aceptada_version=NULL,total_centavos=(SELECT total_centavos FROM transporte.cotizaciones WHERE id=qid) WHERE id=r.id;
 RETURN qid;
END $$;

CREATE FUNCTION transporte.aceptar_cotizacion(p_reserva uuid,p_version integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas;
BEGIN r:=transporte.reserva_autorizada(p_reserva); PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR r.cotizacion_version<>p_version OR p_version<1 THEN RAISE EXCEPTION 'Cotizacion vencida o version incorrecta'; END IF;
 UPDATE transporte.reservas SET aceptada_version=p_version WHERE id=r.id;
END $$;

CREATE FUNCTION transporte.crear_intento_pago(p_reserva uuid,p_metodo text,p_cuenta uuid,p_clave text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; m transporte.metodos_pago; cfg transporte.cooperativa_metodos_pago; cuenta transporte.cuentas_bancarias; anterior transporte.intentos_pago; iid uuid;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva); PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 SELECT * INTO anterior FROM transporte.intentos_pago WHERE actor_id=transporte.actor() AND clave_intento=p_clave;
 SELECT * INTO m FROM transporte.metodos_pago WHERE codigo=p_metodo;
 IF anterior.id IS NOT NULL THEN
  IF anterior.reserva_id<>r.id OR anterior.metodo_id IS DISTINCT FROM m.id OR anterior.cuenta_id IS DISTINCT FROM p_cuenta THEN RAISE EXCEPTION 'Clave reutilizada con otro contenido'; END IF; RETURN anterior.id;
 END IF;
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR r.aceptada_version IS DISTINCT FROM r.cotizacion_version OR r.cotizacion_version<1 OR length(trim(coalesce(p_clave,'')))=0 THEN RAISE EXCEPTION 'Reserva/cotizacion/clave no valida'; END IF;
 SELECT * INTO cfg FROM transporte.cooperativa_metodos_pago WHERE cooperativa_id=r.cooperativa_id AND metodo_id=m.id;
 IF cfg.id IS NULL OR NOT cfg.habilitado OR NOT m.adaptador_disponible THEN RAISE EXCEPTION 'Metodo no habilitado o sin adaptador'; END IF;
 IF m.tipo='PASARELA' THEN RAISE EXCEPTION 'Adaptador de pasarela no implementado en este paquete SQL'; END IF;
 IF p_metodo='EFECTIVO' THEN PERFORM transporte.exigir('oficina.vender',r.cooperativa_id,r.oficina_id); END IF;
 IF p_metodo='BANCO' THEN
  SELECT * INTO cuenta FROM transporte.cuentas_bancarias WHERE id=p_cuenta AND cooperativa_id=r.cooperativa_id AND activa;
  IF cuenta.id IS NULL THEN RAISE EXCEPTION 'Cuenta receptora no valida'; END IF;
 ELSIF p_cuenta IS NOT NULL THEN RAISE EXCEPTION 'Este metodo no recibe cuenta bancaria'; END IF;
 INSERT INTO transporte.intentos_pago(cooperativa_id,reserva_id,actor_id,metodo_id,cuenta_id,cuenta_snapshot,clave_intento,total_centavos,cotizacion_version)
 VALUES(r.cooperativa_id,r.id,transporte.actor(),m.id,cuenta.id,CASE WHEN cuenta.id IS NULL THEN NULL ELSE to_jsonb(cuenta)-'created_at'-'updated_at' END,p_clave,r.total_centavos,r.cotizacion_version) RETURNING id INTO iid; RETURN iid;
END $$;

CREATE FUNCTION transporte.registrar_comprobante(p_intento uuid,p_archivo uuid,p_referencia text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE i transporte.intentos_pago; r transporte.reservas; a transporte.archivos; cfg transporte.politica_comprobantes; c transporte.comprobantes; cid uuid;
BEGIN
 SELECT * INTO i FROM transporte.intentos_pago WHERE id=p_intento; r:=transporte.reserva_autorizada(i.reserva_id); PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 SELECT * INTO c FROM transporte.comprobantes WHERE intento_id=i.id;
 IF c.id IS NOT NULL THEN IF c.archivo_id<>p_archivo OR c.referencia IS DISTINCT FROM nullif(trim(p_referencia),'') THEN RAISE EXCEPTION 'Envio repetido con archivo/referencia distintos'; END IF; RETURN c.id; END IF;
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR i.estado<>'PENDIENTE' OR(SELECT codigo FROM transporte.metodos_pago WHERE id=i.metodo_id)<>'BANCO' THEN RAISE EXCEPTION 'Intento no recibe comprobante'; END IF;
 SELECT * INTO a FROM transporte.archivos WHERE id=p_archivo AND propietario_id=transporte.actor() AND cooperativa_id=r.cooperativa_id AND categoria='COMPROBANTE' AND validado_servidor;
 SELECT * INTO cfg FROM transporte.politica_comprobantes WHERE cooperativa_id=r.cooperativa_id;
 IF a.id IS NULL OR cfg.id IS NULL OR a.bytes>cfg.max_bytes OR NOT(a.mime=ANY(cfg.mimes)) OR length(coalesce(p_referencia,''))>120 OR(cfg.referencia_obligatoria AND length(trim(coalesce(p_referencia,'')))=0) THEN RAISE EXCEPTION 'Archivo o referencia no validos'; END IF;
 INSERT INTO transporte.comprobantes(cooperativa_id,intento_id,archivo_id,referencia) VALUES(r.cooperativa_id,i.id,a.id,nullif(trim(p_referencia),'')) RETURNING id INTO cid;
 UPDATE transporte.intentos_pago SET estado='EN_REVISION' WHERE id=i.id;
 INSERT INTO transporte.notificaciones(usuario_id,cooperativa_id,tipo,canal,evento_clave,payload) VALUES(r.cliente_id,r.cooperativa_id,'PAGO_EN_REVISION','APP','comprobante:'||cid,jsonb_build_object('reservaId',r.id)); RETURN cid;
END $$;

-- Función interna, NO se concede EXECUTE al usuario de aplicación.
CREATE FUNCTION transporte.confirmar_compra_interna(p_intento uuid,p_recibido bigint DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE i transporte.intentos_pago; r transporte.reservas; v transporte.viajes; pid uuid; cid uuid; politica uuid;
BEGIN
 SELECT * INTO i FROM transporte.intentos_pago WHERE id=p_intento; SELECT * INTO r FROM transporte.reservas WHERE id=i.reserva_id FOR UPDATE; SELECT * INTO v FROM transporte.viajes WHERE id=r.viaje_id;
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR v.salida<=now() OR v.estado<>'PUBLICADO' OR r.aceptada_version IS DISTINCT FROM i.cotizacion_version OR i.total_centavos<>r.total_centavos OR(SELECT count(*) FROM transporte.reserva_asientos WHERE reserva_id=r.id AND estado='RETENIDO' AND expires_at>now())<>r.cantidad THEN RAISE EXCEPTION 'Reserva no confirmable; conciliar fondos sin emitir boleto'; END IF;
 IF p_recibido IS NOT NULL AND p_recibido<i.total_centavos THEN RAISE EXCEPTION 'Efectivo insuficiente'; END IF;
 INSERT INTO transporte.pagos(cooperativa_id,reserva_id,intento_id,monto_centavos,recibido_centavos,cambio_centavos,confirmado_por) VALUES(r.cooperativa_id,r.id,i.id,i.total_centavos,p_recibido,CASE WHEN p_recibido IS NULL THEN NULL ELSE p_recibido-i.total_centavos END,transporte.actor()) RETURNING id INTO pid;
 SELECT id INTO politica FROM transporte.politicas_reembolso WHERE cooperativa_id=r.cooperativa_id AND estado='PUBLICADA';
 INSERT INTO transporte.compras(cooperativa_id,reserva_id,pago_id,politica_reembolso_id,viaje_snapshot,total_pagado_centavos) VALUES(r.cooperativa_id,r.id,pid,politica,to_jsonb(v)||jsonb_build_object('origenOrden',r.origen_orden,'destinoOrden',r.destino_orden,'cooperativa',(SELECT jsonb_build_object('nombre',nombre,'razonSocial',razon_social,'ruc',ruc) FROM transporte.cooperativas WHERE id=r.cooperativa_id),'bus',(SELECT jsonb_build_object('unidad',b.unidad,'placa',b.placa,'chasis',b.chasis,'carroceria',b.carroceria,'grupo',g.nombre) FROM transporte.buses b JOIN transporte.grupos_bus g ON g.id=b.grupo_id WHERE b.id=v.bus_id),'terminalOrigen',(SELECT jsonb_build_object('terminal',t.nombre,'ciudad',c.nombre) FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id JOIN transporte.ciudades c ON c.id=t.ciudad_id JOIN transporte.frecuencias f ON f.ruta_id=p.ruta_id WHERE f.id=v.frecuencia_id AND p.orden=r.origen_orden),'terminalDestino',(SELECT jsonb_build_object('terminal',t.nombre,'ciudad',c.nombre) FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id JOIN transporte.ciudades c ON c.id=t.ciudad_id JOIN transporte.frecuencias f ON f.ruta_id=p.ruta_id WHERE f.id=v.frecuencia_id AND p.orden=r.destino_orden)),i.total_centavos) RETURNING id INTO cid;
 INSERT INTO transporte.boletos(cooperativa_id,compra_id) VALUES(r.cooperativa_id,cid);
 UPDATE transporte.reserva_asientos SET estado='CONFIRMADO' WHERE reserva_id=r.id AND estado='RETENIDO'; UPDATE transporte.reservas SET estado='CONFIRMADA' WHERE id=r.id; UPDATE transporte.intentos_pago SET estado='APROBADO' WHERE id=i.id;
 INSERT INTO transporte.notificaciones(usuario_id,cooperativa_id,tipo,canal,evento_clave,payload) SELECT r.cliente_id,r.cooperativa_id,'COMPRA_CONFIRMADA',canal,'compra:'||cid,jsonb_build_object('compraId',cid,'documentoPendiente',true) FROM unnest(ARRAY['APP','EMAIL','WHATSAPP']) canal;
 RETURN cid;
END $$;

CREATE FUNCTION transporte.decidir_comprobante(p_comprobante uuid,p_aprobar boolean,p_motivo text,p_version integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE c transporte.comprobantes; i transporte.intentos_pago; r transporte.reservas; cid uuid;
BEGIN
 SELECT * INTO c FROM transporte.comprobantes WHERE id=p_comprobante; SELECT * INTO i FROM transporte.intentos_pago WHERE id=c.intento_id; SELECT * INTO r FROM transporte.reservas WHERE id=i.reserva_id;
 PERFORM transporte.exigir('pagos.revisar',r.cooperativa_id,r.oficina_id); PERFORM 1 FROM transporte.viajes WHERE id=r.viaje_id FOR UPDATE; PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 SELECT * INTO c FROM transporte.comprobantes WHERE id=p_comprobante FOR UPDATE;
 IF c.estado<>'EN_REVISION' THEN
  IF(p_aprobar AND c.estado='APROBADO') OR(NOT p_aprobar AND c.estado='RECHAZADO') THEN SELECT id INTO cid FROM transporte.compras WHERE reserva_id=r.id; RETURN cid; END IF; RAISE EXCEPTION 'Comprobante ya resuelto';
 END IF;
 IF c.version<>p_version THEN RAISE EXCEPTION 'Version de comprobante incorrecta'; END IF;
 IF NOT p_aprobar AND length(trim(coalesce(p_motivo,'')))=0 OR length(coalesce(p_motivo,''))>300 THEN RAISE EXCEPTION 'Motivo requerido/maximo300'; END IF;
 IF p_aprobar THEN cid:=transporte.confirmar_compra_interna(i.id); ELSE UPDATE transporte.intentos_pago SET estado='RECHAZADO' WHERE id=i.id; END IF;
 UPDATE transporte.comprobantes SET estado=CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,motivo=nullif(trim(p_motivo),''),revisado_por=transporte.actor(),revisado_at=now(),version=version+1 WHERE id=c.id; RETURN cid;
END $$;

CREATE FUNCTION transporte.cobrar_efectivo(p_reserva uuid,p_recibido bigint,p_clave text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; iid uuid; cid uuid; pag transporte.pagos;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva); PERFORM transporte.exigir('oficina.vender',r.cooperativa_id,r.oficina_id);
 PERFORM 1 FROM transporte.viajes WHERE id=r.viaje_id FOR UPDATE; PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 iid:=transporte.crear_intento_pago(r.id,'EFECTIVO',NULL,p_clave);
 SELECT * INTO pag FROM transporte.pagos WHERE intento_id=iid;
 IF pag.id IS NOT NULL THEN IF pag.recibido_centavos IS DISTINCT FROM p_recibido THEN RAISE EXCEPTION 'Clave repetida con recibido distinto'; END IF; SELECT id INTO cid FROM transporte.compras WHERE pago_id=pag.id; RETURN cid; END IF;
 RETURN transporte.confirmar_compra_interna(iid,p_recibido);
END $$;

CREATE FUNCTION transporte.publicar_politica_reembolso(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE p transporte.politicas_reembolso; r record; proximo integer:=0; infinito boolean:=false;
BEGIN
 SELECT * INTO p FROM transporte.politicas_reembolso WHERE id=p_id FOR UPDATE; PERFORM transporte.exigir('tarifas.admin',p.cooperativa_id);
 IF p.estado<>'BORRADOR' OR p.plazo_abono_dias IS NULL OR length(trim(coalesce(p.condiciones,'')))=0 THEN RAISE EXCEPTION 'Complete politica/plazo de abono'; END IF;
 FOR r IN SELECT * FROM transporte.reglas_reembolso WHERE politica_id=p.id ORDER BY minutos_desde LOOP
  IF infinito OR r.minutos_desde<>proximo THEN RAISE EXCEPTION 'Hueco o solape en limites horarios'; END IF;
  infinito:=r.minutos_hasta IS NULL; proximo:=r.minutos_hasta;
 END LOOP;
 IF NOT infinito THEN RAISE EXCEPTION 'Falta cubrir intervalo completo0..infinito'; END IF;
 UPDATE transporte.politicas_reembolso SET estado='RETIRADA' WHERE cooperativa_id=p.cooperativa_id AND estado='PUBLICADA';
 UPDATE transporte.politicas_reembolso SET estado='PUBLICADA',publicada_at=now() WHERE id=p.id;
END $$;

CREATE FUNCTION transporte.elegibilidad_reembolso(p_compra uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE c transporte.compras; r transporte.reservas; v transporte.viajes; regla transporte.reglas_reembolso; mins integer;
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra; r:=transporte.reserva_autorizada(c.reserva_id); SELECT * INTO v FROM transporte.viajes WHERE id=r.viaje_id;
 IF c.estado<>'CONFIRMADA' OR v.salida<=now() OR EXISTS(SELECT 1 FROM transporte.abordajes WHERE compra_id=c.id) THEN RETURN jsonb_build_object('elegible',false,'motivo','VIAJE_INICIADO_CANCELADO_O_ABORDADO'); END IF;
 IF c.politica_reembolso_id IS NULL THEN RETURN jsonb_build_object('elegible',false,'motivo','SIN_POLITICA_PUBLICADA_EN_LA_COMPRA'); END IF;
 mins:=floor(extract(epoch FROM(v.salida-now()))/60)::integer;
 SELECT * INTO regla FROM transporte.reglas_reembolso WHERE politica_id=c.politica_reembolso_id AND int4range(minutos_desde,minutos_hasta,'[)') @> mins;
 IF regla.id IS NULL THEN RETURN jsonb_build_object('elegible',false,'motivo','REGLA_INCOMPLETA'); END IF;
 RETURN jsonb_build_object('elegible',true,'politicaId',c.politica_reembolso_id,'reglaId',regla.id,'minutos',mins,'porcentajeBp',regla.porcentaje_bp,'montoCentavos',round(c.total_pagado_centavos*regla.porcentaje_bp/10000.0)::bigint);
END $$;

CREATE FUNCTION transporte.solicitar_reembolso(p_compra uuid,p_motivo text,p_clave text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE c transporte.compras; r transporte.reservas; e jsonb; anterior transporte.solicitudes_reembolso; sid uuid;
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra; r:=transporte.reserva_autorizada(c.reserva_id); PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE;
 SELECT * INTO anterior FROM transporte.solicitudes_reembolso WHERE solicitado_por=transporte.actor() AND clave_intento=p_clave;
 IF anterior.id IS NOT NULL THEN IF anterior.compra_id<>c.id OR anterior.motivo<>p_motivo THEN RAISE EXCEPTION 'Clave repetida con contenido distinto'; END IF; RETURN anterior.id; END IF;
 IF length(trim(coalesce(p_motivo,'')))=0 OR length(trim(coalesce(p_clave,'')))=0 THEN RAISE EXCEPTION 'Indique motivo/clave'; END IF;
 e:=transporte.elegibilidad_reembolso(c.id); IF NOT(e->>'elegible')::boolean THEN RAISE EXCEPTION 'No elegible: %',e->>'motivo'; END IF;
 INSERT INTO transporte.solicitudes_reembolso(cooperativa_id,compra_id,solicitado_por,politica_id,regla_id,porcentaje_bp,monto_centavos,motivo,clave_intento) VALUES(c.cooperativa_id,c.id,transporte.actor(),(e->>'politicaId')::uuid,(e->>'reglaId')::uuid,(e->>'porcentajeBp')::integer,(e->>'montoCentavos')::bigint,p_motivo,p_clave) RETURNING id INTO sid; RETURN sid;
END $$;

CREATE FUNCTION transporte.decidir_reembolso(p_solicitud uuid,p_aprobar boolean,p_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE s transporte.solicitudes_reembolso; c transporte.compras; r transporte.reservas;
BEGIN
 SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud; SELECT * INTO c FROM transporte.compras WHERE id=s.compra_id; SELECT * INTO r FROM transporte.reservas WHERE id=c.reserva_id;
 PERFORM transporte.exigir('reembolsos.gestionar',r.cooperativa_id,r.oficina_id); PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE; SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud FOR UPDATE;
 IF s.estado<>'SOLICITADO' THEN IF(p_aprobar AND s.estado='APROBADO') OR(NOT p_aprobar AND s.estado='RECHAZADO') THEN RETURN; END IF; RAISE EXCEPTION 'Solicitud ya resuelta'; END IF;
 IF length(trim(coalesce(p_motivo,'')))=0 THEN RAISE EXCEPTION 'Motivo de decision requerido'; END IF;
 IF p_aprobar THEN
  IF EXISTS(SELECT 1 FROM transporte.abordajes WHERE compra_id=c.id) THEN RAISE EXCEPTION 'Compra abordada requiere conciliacion manual'; END IF;
  UPDATE transporte.compras SET estado='CANCELADA' WHERE id=c.id; UPDATE transporte.reservas SET estado='CANCELADA' WHERE id=r.id; UPDATE transporte.reserva_asientos SET estado='LIBERADO' WHERE reserva_id=r.id; UPDATE transporte.boletos SET estado='ANULADO' WHERE compra_id=c.id;
 END IF;
 UPDATE transporte.solicitudes_reembolso SET estado=CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,decision_motivo=p_motivo,decidido_por=transporte.actor(),decidido_at=now() WHERE id=s.id;
END $$;

CREATE FUNCTION transporte.registrar_abono_reembolso(p_solicitud uuid,p_referencia text,p_evidencia uuid,p_clave text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE s transporte.solicitudes_reembolso; c transporte.compras; r transporte.reservas; ant transporte.reembolsos; rid uuid;
BEGIN
 SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud; SELECT * INTO c FROM transporte.compras WHERE id=s.compra_id; SELECT * INTO r FROM transporte.reservas WHERE id=c.reserva_id;
 PERFORM transporte.exigir('reembolsos.gestionar',r.cooperativa_id,r.oficina_id); PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE; SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud FOR UPDATE;
 SELECT * INTO ant FROM transporte.reembolsos WHERE clave_intento=p_clave;
 IF ant.id IS NOT NULL THEN IF ant.solicitud_id<>s.id OR ant.referencia_externa<>p_referencia THEN RAISE EXCEPTION 'Clave repetida con distinto abono'; END IF; RETURN ant.id; END IF;
 IF s.estado<>'APROBADO' OR s.monto_centavos>c.total_pagado_centavos OR length(trim(coalesce(p_clave,'')))=0 THEN RAISE EXCEPTION 'Abono no permitido'; END IF;
 IF p_evidencia IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.archivos WHERE id=p_evidencia AND cooperativa_id=c.cooperativa_id AND validado_servidor AND categoria='REEMBOLSO') THEN RAISE EXCEPTION 'Evidencia no valida'; END IF;
 INSERT INTO transporte.reembolsos(cooperativa_id,solicitud_id,pago_id,monto_centavos,ejecutado_por,referencia_externa,evidencia_archivo_id,clave_intento) VALUES(c.cooperativa_id,s.id,c.pago_id,s.monto_centavos,transporte.actor(),p_referencia,p_evidencia,p_clave) RETURNING id INTO rid;
 UPDATE transporte.solicitudes_reembolso SET estado='EJECUTADO' WHERE id=s.id; UPDATE transporte.compras SET estado='REEMBOLSADA' WHERE id=c.id;
 INSERT INTO transporte.notificaciones(usuario_id,cooperativa_id,tipo,canal,evento_clave,payload) VALUES(r.cliente_id,c.cooperativa_id,'REEMBOLSO_REGISTRADO','APP','reembolso:'||rid,jsonb_build_object('compraId',c.id,'montoCentavos',s.monto_centavos)); RETURN rid;
END $$;

CREATE FUNCTION transporte.registrar_abordaje(p_qr uuid,p_asiento_reserva uuid,p_clave text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE b transporte.boletos; c transporte.compras; r transporte.reservas; v transporte.viajes; aid uuid;
BEGIN
 SELECT * INTO b FROM transporte.boletos WHERE qr_id=p_qr; SELECT * INTO c FROM transporte.compras WHERE id=b.compra_id; SELECT * INTO r FROM transporte.reservas WHERE id=c.reserva_id; SELECT * INTO v FROM transporte.viajes WHERE id=r.viaje_id;
 PERFORM transporte.exigir('abordaje.registrar',c.cooperativa_id); PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE;
 IF b.estado<>'LISTO' OR c.estado<>'CONFIRMADA' OR v.estado NOT IN('PUBLICADO','EN_RUTA') OR(v.conductor_id IS NOT NULL AND v.conductor_id<>transporte.actor() AND NOT transporte.puede('operacion.admin',c.cooperativa_id)) OR NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos WHERE id=p_asiento_reserva AND reserva_id=r.id AND estado='CONFIRMADO') THEN RAISE EXCEPTION 'Boleto/pasajero/viaje no valido'; END IF;
 SELECT id INTO aid FROM transporte.abordajes WHERE clave_intento=p_clave AND compra_id=c.id AND reserva_asiento_id=p_asiento_reserva; IF aid IS NOT NULL THEN RETURN aid; END IF;
 INSERT INTO transporte.abordajes(cooperativa_id,compra_id,reserva_asiento_id,operador_id,clave_intento) VALUES(c.cooperativa_id,c.id,p_asiento_reserva,transporte.actor(),p_clave) RETURNING id INTO aid; RETURN aid;
END $$;

ALTER TABLE transporte.impuestos ADD CONSTRAINT transporte_iva_cero CHECK(concepto<>'TRANSPORTE_TERRESTRE' OR puntos_base=0);
ALTER TABLE transporte.pasajeros ADD CONSTRAINT nombres_completos CHECK(length(trim(nombres))>0 AND length(trim(apellidos))>0 AND length(trim(documento))>0);
CREATE FUNCTION transporte.tg_actualizar() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION transporte.tg_auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE rowj jsonb:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
 INSERT INTO transporte.auditoria(actor_id,cooperativa_id,entidad,entidad_id,accion,request_id,datos) VALUES(transporte.actor(),nullif(rowj->>'cooperativa_id','')::uuid,TG_TABLE_NAME,(rowj->>'id')::uuid,TG_OP,nullif(current_setting('app.request_id',true),''),jsonb_build_object('version',rowj->'version','estado',rowj->'estado'));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='transporte' LOOP
  EXECUTE format('CREATE TRIGGER actualizar_timestamp BEFORE UPDATE ON transporte.%I FOR EACH ROW EXECUTE FUNCTION transporte.tg_actualizar()',t.tablename);
  IF t.tablename NOT IN('auditoria','schema_version','sesiones','tokens_identidad','credenciales','rol_permiso','notificaciones') THEN
   EXECUTE format('CREATE TRIGGER auditar_cambio AFTER INSERT OR UPDATE OR DELETE ON transporte.%I FOR EACH ROW EXECUTE FUNCTION transporte.tg_auditar()',t.tablename);
  END IF;
 END LOOP;
END $$;

CREATE FUNCTION transporte.tg_ambito_rol() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM transporte.roles WHERE id=NEW.rol_id AND ambito=CASE WHEN TG_TABLE_NAME='membresias' THEN 'COOPERATIVA' ELSE 'GLOBAL' END) THEN RAISE EXCEPTION 'Rol de ambito incompatible'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER rol_membresia BEFORE INSERT OR UPDATE ON transporte.membresias FOR EACH ROW EXECUTE FUNCTION transporte.tg_ambito_rol();
CREATE TRIGGER rol_global BEFORE INSERT OR UPDATE ON transporte.usuario_roles_globales FOR EACH ROW EXECUTE FUNCTION transporte.tg_ambito_rol();

CREATE FUNCTION transporte.tg_viaje_valido() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE f transporte.frecuencias; b transporte.buses;
BEGIN
 SELECT * INTO f FROM transporte.frecuencias WHERE id=NEW.frecuencia_id; SELECT * INTO b FROM transporte.buses WHERE id=NEW.bus_id;
 IF NEW.estado IN('BORRADOR','PUBLICADO','EN_RUTA') THEN
  IF NOT EXISTS(SELECT 1 FROM transporte.frecuencia_grupo WHERE frecuencia_id=f.id AND grupo_id=b.grupo_id) THEN RAISE EXCEPTION 'Grupo no habilitado para frecuencia'; END IF;
  IF EXISTS(SELECT 1 FROM transporte.indisponibilidades_bus WHERE bus_id=b.id AND tstzrange(desde,hasta,'[)') && tstzrange(NEW.salida,NEW.liberacion_bus,'[)')) OR EXISTS(SELECT 1 FROM transporte.grupo_dias_parada WHERE grupo_id=b.grupo_id AND dia_iso=extract(isodow FROM NEW.salida AT TIME ZONE 'America/Guayaquil')) THEN RAISE EXCEPTION 'Bus/grupo en parada o indisponible'; END IF;
 END IF;
 IF NEW.estado='PUBLICADO' THEN
  IF NOT f.activa OR NOT b.activo OR NOT EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id=NEW.cooperativa_id AND activa) OR NOT EXISTS(SELECT 1 FROM transporte.planos WHERE id=NEW.plano_id AND publicado) THEN RAISE EXCEPTION 'Frecuencia, bus, plano o cooperativa inactivos'; END IF;
  IF NOT EXISTS(SELECT 1 FROM transporte.plano_celdas WHERE plano_id=NEW.plano_id AND tipo='ASIENTO' AND activa) THEN RAISE EXCEPTION 'Plano sin asientos'; END IF;
  IF NOT EXISTS(SELECT 1 FROM transporte.tarifas WHERE frecuencia_id=f.id AND grupo_id=b.grupo_id AND activa AND vigencia @> (NEW.salida AT TIME ZONE 'America/Guayaquil')::date) THEN RAISE EXCEPTION 'Falta tarifa vigente antes de publicar'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM transporte.reservas WHERE viaje_id=OLD.id AND estado='CONFIRMADA') AND(NEW.bus_id<>OLD.bus_id OR NEW.plano_id<>OLD.plano_id OR NEW.frecuencia_id<>OLD.frecuencia_id OR NEW.salida<>OLD.salida) THEN RAISE EXCEPTION 'Viaje vendido: requiere proceso de cambio/conciliacion, no reemplazo directo'; END IF;
 IF TG_OP='UPDATE' AND NEW.estado='CANCELADO' AND OLD.estado<>'CANCELADO' AND EXISTS(SELECT 1 FROM transporte.reservas WHERE viaje_id=OLD.id AND estado='CONFIRMADA') THEN RAISE EXCEPTION 'Viaje vendido: concilie compras antes de cancelar la salida'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER viaje_valido BEFORE INSERT OR UPDATE ON transporte.viajes FOR EACH ROW EXECUTE FUNCTION transporte.tg_viaje_valido();

CREATE FUNCTION transporte.tg_plano_inmutable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE pid uuid:=CASE WHEN TG_OP='DELETE' THEN OLD.plano_id ELSE NEW.plano_id END;
BEGIN
 IF EXISTS(SELECT 1 FROM transporte.viajes WHERE plano_id=pid AND estado<>'CANCELADO') THEN RAISE EXCEPTION 'Plano en uso: cree una nueva version'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM transporte.viajes WHERE plano_id=OLD.plano_id AND estado<>'CANCELADO') THEN RAISE EXCEPTION 'No mueva una celda de un plano en uso'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.piso>(SELECT pisos FROM transporte.planos WHERE id=pid) THEN RAISE EXCEPTION 'Piso fuera de plano'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER plano_inmutable BEFORE INSERT OR UPDATE OR DELETE ON transporte.plano_celdas FOR EACH ROW EXECUTE FUNCTION transporte.tg_plano_inmutable();

CREATE FUNCTION transporte.tg_regla_inmutable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE pid uuid:=CASE WHEN TG_OP='DELETE' THEN OLD.politica_id ELSE NEW.politica_id END;
BEGIN
 IF(SELECT estado FROM transporte.politicas_reembolso WHERE id=pid)<>'BORRADOR' THEN RAISE EXCEPTION 'Reglas de politica publicada/retirada son inmutables'; END IF;
 IF TG_OP='UPDATE' AND(SELECT estado FROM transporte.politicas_reembolso WHERE id=OLD.politica_id)<>'BORRADOR' THEN RAISE EXCEPTION 'No mueva una regla historica a otra politica'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER regla_inmutable BEFORE INSERT OR UPDATE OR DELETE ON transporte.reglas_reembolso FOR EACH ROW EXECUTE FUNCTION transporte.tg_regla_inmutable();

CREATE FUNCTION transporte.cancelar_reserva_pendiente(p_reserva uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva); SELECT * INTO r FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 IF r.estado='CANCELADA' THEN RETURN; END IF;
 IF r.estado<>'PENDIENTE' OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id=r.id AND estado IN('EN_REVISION','APROBADO')) THEN RAISE EXCEPTION 'Debe conciliar el pago o usar solicitud de reembolso'; END IF;
 UPDATE transporte.reservas SET estado='CANCELADA' WHERE id=r.id; UPDATE transporte.reserva_asientos SET estado='LIBERADO' WHERE reserva_id=r.id; UPDATE transporte.intentos_pago SET estado='ANULADO' WHERE reserva_id=r.id AND estado='PENDIENTE';
END $$;

CREATE FUNCTION transporte.marcar_boleto_emitido(p_compra uuid,p_archivo uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE c transporte.compras;
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra FOR UPDATE;
 IF c.id IS NULL OR c.estado<>'CONFIRMADA' THEN RAISE EXCEPTION 'Compra no emitible'; END IF;
 PERFORM transporte.exigir('pagos.revisar',c.cooperativa_id);
 IF NOT EXISTS(SELECT 1 FROM transporte.archivos WHERE id=p_archivo AND cooperativa_id=c.cooperativa_id AND categoria='DOCUMENTO' AND mime='application/pdf' AND validado_servidor) THEN RAISE EXCEPTION 'Documento privado no valido'; END IF;
 UPDATE transporte.boletos SET estado='LISTO',archivo_id=p_archivo,emitido_at=now() WHERE compra_id=c.id;
END $$;

CREATE FUNCTION transporte.buscar_viajes(p_origen_ciudad uuid,p_destino_ciudad uuid,p_fecha date,p_cantidad integer DEFAULT 1,p_cooperativa uuid DEFAULT NULL,p_clase text DEFAULT NULL,p_chasis text DEFAULT NULL,p_carroceria text DEFAULT NULL,p_tipo text DEFAULT NULL,p_desde uuid DEFAULT NULL)
RETURNS TABLE(viaje_id uuid,cooperativa text,salida timestamptz,llegada timestamptz,origen_orden integer,destino_orden integer,bus jsonb,plazas_disponibles bigint,tarifa_desde_centavos bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT v.id,c.nombre,v.salida,v.llegada,po.orden,pd.orden,
 jsonb_build_object('id',b.id,'unidad',b.unidad,'placa',b.placa,'chasis',b.chasis,'carroceria',b.carroceria,'grupo',g.nombre,'planoId',v.plano_id),
 x.libres,tf.precio FROM transporte.viajes v JOIN transporte.cooperativas c ON c.id=v.cooperativa_id JOIN transporte.frecuencias f ON f.id=v.frecuencia_id JOIN transporte.buses b ON b.id=v.bus_id JOIN transporte.grupos_bus g ON g.id=b.grupo_id
 JOIN transporte.ruta_paradas po ON po.ruta_id=f.ruta_id JOIN transporte.terminales tor ON tor.id=po.terminal_id JOIN transporte.ruta_paradas pd ON pd.ruta_id=f.ruta_id JOIN transporte.terminales tde ON tde.id=pd.terminal_id
 CROSS JOIN LATERAL(SELECT count(*) libres FROM transporte.plano_celdas pc JOIN transporte.clases_asiento cla ON cla.id=pc.clase_id WHERE pc.plano_id=v.plano_id AND pc.tipo='ASIENTO' AND pc.activa AND(p_clase IS NULL OR cla.codigo=p_clase) AND NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos a WHERE a.viaje_id=v.id AND a.asiento_id=pc.id AND(a.estado='CONFIRMADO' OR(a.estado='RETENIDO' AND a.expires_at>now())) AND int4range(a.origen_orden,a.destino_orden,'[)') && int4range(po.orden,pd.orden,'[)'))) x
 CROSS JOIN LATERAL(SELECT min(t.precio_centavos) precio FROM transporte.tarifas t JOIN transporte.clases_asiento cla ON cla.id=t.clase_id WHERE t.frecuencia_id=f.id AND t.grupo_id=g.id AND t.origen_orden=po.orden AND t.destino_orden=pd.orden AND t.activa AND t.vigencia @> p_fecha AND(p_clase IS NULL OR cla.codigo=p_clase)) tf
 WHERE v.estado='PUBLICADO' AND c.activa AND f.activa AND b.activo AND v.salida>now() AND (v.salida AT TIME ZONE 'America/Guayaquil')::date=p_fecha AND tor.ciudad_id=p_origen_ciudad AND tde.ciudad_id=p_destino_ciudad AND po.orden<pd.orden
 AND(f.tipo_viaje='CON_PARADAS' OR(po.orden=(SELECT min(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id) AND pd.orden=(SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id)))
 AND(p_cooperativa IS NULL OR c.id=p_cooperativa) AND(p_chasis IS NULL OR b.chasis ILIKE '%'||p_chasis||'%') AND(p_carroceria IS NULL OR b.carroceria ILIKE '%'||p_carroceria||'%') AND(p_tipo IS NULL OR f.tipo_viaje=p_tipo) AND(p_desde IS NULL OR v.id>p_desde) AND x.libres>=greatest(p_cantidad,1) AND tf.precio IS NOT NULL ORDER BY v.id LIMIT 50 $$;

CREATE FUNCTION transporte.cuentas_publicas(p_coop uuid,p_buscar text DEFAULT '',p_cursor uuid DEFAULT NULL,p_limite integer DEFAULT 10)
RETURNS TABLE(cuenta_id uuid,banco text,tipo text,numero text,titular text,documento_titular text,alias text,qr_disponible boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT a.id,b.nombre,a.tipo,a.numero,a.titular,a.documento_titular,a.alias,a.qr_archivo_id IS NOT NULL FROM transporte.cuentas_bancarias a JOIN transporte.bancos b ON b.id=a.banco_id JOIN transporte.cooperativas c ON c.id=a.cooperativa_id WHERE a.cooperativa_id=p_coop AND a.activa AND b.activo AND c.activa AND(p_cursor IS NULL OR a.id>p_cursor) AND(b.nombre ILIKE '%'||p_buscar||'%' OR a.numero ILIKE '%'||p_buscar||'%') ORDER BY a.id LIMIT least(greatest(p_limite,1),50) $$;

CREATE VIEW transporte.v_capacidad_plano WITH(security_invoker=true) AS
 SELECT p.cooperativa_id,p.id plano_id,p.bus_id,p.numero_version,p.pisos,count(c.id) FILTER(WHERE c.tipo='ASIENTO' AND c.activa) capacidad FROM transporte.planos p LEFT JOIN transporte.plano_celdas c ON c.plano_id=p.id GROUP BY p.id;
CREATE VIEW transporte.v_mis_viajes WITH(security_invoker=true) AS
 SELECT r.cliente_id,c.cooperativa_id,c.id compra_id,c.codigo,c.estado,r.id reserva_id,r.viaje_id,v.salida,v.llegada,r.cantidad,c.total_pagado_centavos,b.id boleto_id,b.estado estado_documento,b.qr_id,CASE WHEN v.salida>now() AND c.estado='CONFIRMADA' THEN 'PROXIMOS' ELSE 'HISTORIAL' END seccion FROM transporte.compras c JOIN transporte.reservas r ON r.id=c.reserva_id JOIN transporte.viajes v ON v.id=r.viaje_id LEFT JOIN transporte.boletos b ON b.compra_id=c.id;
CREATE VIEW transporte.v_cola_comprobantes WITH(security_invoker=true) AS
 SELECT c.cooperativa_id,c.id comprobante_id,c.estado,c.created_at,c.version,c.referencia,i.id intento_id,i.total_centavos,i.cuenta_snapshot,r.id reserva_id,r.oficina_id,r.cliente_id,v.salida,u.nombres,u.apellidos FROM transporte.comprobantes c JOIN transporte.intentos_pago i ON i.id=c.intento_id JOIN transporte.reservas r ON r.id=i.reserva_id JOIN transporte.viajes v ON v.id=r.viaje_id JOIN transporte.usuarios u ON u.id=r.cliente_id;
CREATE VIEW transporte.v_ventas_diarias WITH(security_invoker=true) AS
 SELECT p.cooperativa_id,r.oficina_id,(p.confirmado_at AT TIME ZONE 'America/Guayaquil')::date fecha,count(*) compras,sum(r.cantidad) asientos,sum(p.monto_centavos) bruto_centavos FROM transporte.pagos p JOIN transporte.reservas r ON r.id=p.reserva_id GROUP BY p.cooperativa_id,r.oficina_id,(p.confirmado_at AT TIME ZONE 'America/Guayaquil')::date;
CREATE VIEW transporte.v_reembolsos_diarios WITH(security_invoker=true) AS
 SELECT cooperativa_id,(ejecutado_at AT TIME ZONE 'America/Guayaquil')::date fecha,count(*) devoluciones,sum(monto_centavos) devuelto_centavos FROM transporte.reembolsos GROUP BY cooperativa_id,(ejecutado_at AT TIME ZONE 'America/Guayaquil')::date;
CREATE VIEW transporte.v_grupos_habilitados WITH(security_invoker=true) AS
 SELECT fg.cooperativa_id,fg.frecuencia_id,g.id grupo_id,g.nombre,count(DISTINCT b.id) FILTER(WHERE b.activo) buses_activos FROM transporte.frecuencia_grupo fg JOIN transporte.grupos_bus g ON g.id=fg.grupo_id LEFT JOIN transporte.buses b ON b.grupo_id=g.id GROUP BY fg.cooperativa_id,fg.frecuencia_id,g.id;
CREATE VIEW transporte.v_hoja_ruta WITH(security_invoker=true) AS
 SELECT v.cooperativa_id,v.id viaje_id,v.estado,v.salida,v.llegada,v.liberacion_bus,b.unidad,b.placa,b.grupo_id,f.codigo frecuencia,f.resolucion_ant,r.nombre ruta,v.conductor_id,(SELECT count(*) FROM transporte.reserva_asientos a WHERE a.viaje_id=v.id AND a.estado='CONFIRMADO') plazas_segmentos_confirmados FROM transporte.viajes v JOIN transporte.buses b ON b.id=v.bus_id JOIN transporte.frecuencias f ON f.id=v.frecuencia_id JOIN transporte.rutas r ON r.id=f.ruta_id;

CREATE FUNCTION transporte.obtener_boleto(p_compra uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE c transporte.compras; r transporte.reservas; resultado jsonb;
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra; r:=transporte.reserva_autorizada(c.reserva_id);
 SELECT jsonb_build_object('compra',to_jsonb(c),'documento',(SELECT to_jsonb(b) FROM transporte.boletos b WHERE b.compra_id=c.id),'reserva',to_jsonb(r),'pasajeros',(SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('asiento',pc.codigo) ORDER BY pc.piso,pc.fila,pc.columna) FROM transporte.pasajeros p JOIN transporte.reserva_asientos a ON a.id=p.reserva_asiento_id JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id WHERE a.reserva_id=r.id),'cotizacion',(SELECT to_jsonb(q) FROM transporte.cotizaciones q WHERE q.reserva_id=r.id AND q.version=r.aceptada_version)) INTO resultado; RETURN resultado;
END $$;

CREATE FUNCTION transporte.expirar_pendientes() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE vid uuid; total integer:=0;
BEGIN
 PERFORM transporte.exigir('config.global');
 FOR vid IN SELECT DISTINCT viaje_id FROM transporte.reservas WHERE estado='PENDIENTE' AND expires_at<=now() ORDER BY viaje_id LOOP total:=total+transporte.expirar_reservas(vid); END LOOP; RETURN total;
END $$;

-- La base de datos NO se conecta desde React. El esquema no se expone por Data API.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='transporte_runtime') THEN CREATE ROLE transporte_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='transporte_app') THEN CREATE ROLE transporte_app NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; END IF;
END $$;
GRANT transporte_runtime TO transporte_app;
REVOKE ALL ON SCHEMA transporte FROM PUBLIC;
GRANT USAGE ON SCHEMA transporte TO transporte_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA transporte FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA transporte FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA transporte REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA transporte TO transporte_runtime;
REVOKE ALL ON transporte.credenciales,transporte.tokens_identidad FROM transporte_runtime;

CREATE FUNCTION transporte.reserva_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM transporte.reservas r WHERE r.id=p_id AND(r.cliente_id=transporte.actor() OR transporte.puede('cooperativa.leer',r.cooperativa_id,r.oficina_id))) $$;
CREATE FUNCTION transporte.compra_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM transporte.compras c WHERE c.id=p_id AND transporte.reserva_visible(c.reserva_id)) $$;
CREATE FUNCTION transporte.usuario_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$ SELECT p_id=transporte.actor() OR transporte.puede('identidad.admin') OR EXISTS(SELECT 1 FROM transporte.reservas r WHERE r.cliente_id=p_id AND transporte.puede('cooperativa.leer',r.cooperativa_id,r.oficina_id)) $$;
CREATE FUNCTION transporte.viaje_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM transporte.viajes v WHERE v.id=p_id AND(transporte.puede('cooperativa.leer',v.cooperativa_id) OR EXISTS(SELECT 1 FROM transporte.reservas r WHERE r.viaje_id=v.id AND r.cliente_id=transporte.actor()))) $$;
CREATE FUNCTION transporte.intento_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM transporte.intentos_pago i WHERE i.id=p_id AND transporte.reserva_visible(i.reserva_id)) $$;
CREATE FUNCTION transporte.asiento_reserva_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM transporte.reserva_asientos a WHERE a.id=p_id AND transporte.reserva_visible(a.reserva_id)) $$;
CREATE FUNCTION transporte.cotizacion_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM transporte.cotizaciones q WHERE q.id=p_id AND transporte.reserva_visible(q.reserva_id)) $$;
ALTER TABLE transporte.schema_version ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.schema_version FOR SELECT TO transporte_runtime USING(true);
ALTER TABLE transporte.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.usuarios FOR SELECT TO transporte_runtime USING(transporte.usuario_visible(id));
ALTER TABLE transporte.credenciales ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.credenciales FOR SELECT TO transporte_runtime USING(usuario_id=transporte.actor() OR transporte.puede('identidad.admin'));
ALTER TABLE transporte.sesiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.sesiones FOR SELECT TO transporte_runtime USING(usuario_id=transporte.actor() OR transporte.puede('identidad.admin'));
ALTER TABLE transporte.tokens_identidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.tokens_identidad FOR SELECT TO transporte_runtime USING(usuario_id=transporte.actor() OR transporte.puede('identidad.admin'));
ALTER TABLE transporte.consentimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.consentimientos FOR SELECT TO transporte_runtime USING(usuario_id=transporte.actor() OR transporte.puede('identidad.admin'));
ALTER TABLE transporte.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.roles FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.roles TO transporte_runtime;
CREATE POLICY modificar ON transporte.roles FOR ALL TO transporte_runtime USING(transporte.puede('identidad.admin')) WITH CHECK(transporte.puede('identidad.admin'));
ALTER TABLE transporte.permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.permisos FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.permisos TO transporte_runtime;
CREATE POLICY modificar ON transporte.permisos FOR ALL TO transporte_runtime USING(transporte.puede('identidad.admin')) WITH CHECK(transporte.puede('identidad.admin'));
ALTER TABLE transporte.rol_permiso ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.rol_permiso FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.rol_permiso TO transporte_runtime;
CREATE POLICY modificar ON transporte.rol_permiso FOR ALL TO transporte_runtime USING(transporte.puede('identidad.admin')) WITH CHECK(transporte.puede('identidad.admin'));
ALTER TABLE transporte.usuario_roles_globales ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.usuario_roles_globales FOR SELECT TO transporte_runtime USING(usuario_id=transporte.actor() OR transporte.puede('identidad.admin'));
GRANT INSERT,UPDATE,DELETE ON transporte.usuario_roles_globales TO transporte_runtime;
CREATE POLICY modificar ON transporte.usuario_roles_globales FOR ALL TO transporte_runtime USING(transporte.puede('identidad.admin')) WITH CHECK(transporte.puede('identidad.admin'));
ALTER TABLE transporte.cooperativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.cooperativas FOR SELECT TO transporte_runtime USING(activa OR transporte.puede('cooperativa.leer',id) OR transporte.puede('cooperativas.admin'));
GRANT INSERT,UPDATE,DELETE ON transporte.cooperativas TO transporte_runtime;
CREATE POLICY modificar ON transporte.cooperativas FOR ALL TO transporte_runtime USING(transporte.puede('cooperativas.admin',id)) WITH CHECK(transporte.puede('cooperativas.admin',id));
ALTER TABLE transporte.oficinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.oficinas FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.oficinas TO transporte_runtime;
CREATE POLICY modificar ON transporte.oficinas FOR ALL TO transporte_runtime USING(transporte.puede('config.admin',cooperativa_id)) WITH CHECK(transporte.puede('config.admin',cooperativa_id));
ALTER TABLE transporte.membresias ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.membresias FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.membresias TO transporte_runtime;
CREATE POLICY modificar ON transporte.membresias FOR ALL TO transporte_runtime USING(transporte.puede('config.admin',cooperativa_id)) WITH CHECK(transporte.puede('config.admin',cooperativa_id));
ALTER TABLE transporte.config_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.config_global FOR SELECT TO transporte_runtime USING(transporte.puede('config.global'));
GRANT INSERT,UPDATE,DELETE ON transporte.config_global TO transporte_runtime;
CREATE POLICY modificar ON transporte.config_global FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.archivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.archivos FOR SELECT TO transporte_runtime USING(propietario_id=transporte.actor() OR transporte.puede('pagos.revisar',cooperativa_id) OR transporte.puede('config.admin',cooperativa_id));
ALTER TABLE transporte.config_cooperativa ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.config_cooperativa FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.config_cooperativa TO transporte_runtime;
CREATE POLICY modificar ON transporte.config_cooperativa FOR ALL TO transporte_runtime USING(transporte.puede('config.admin',cooperativa_id)) WITH CHECK(transporte.puede('config.admin',cooperativa_id));
ALTER TABLE transporte.ciudades ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.ciudades FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.ciudades TO transporte_runtime;
CREATE POLICY modificar ON transporte.ciudades FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.terminales ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.terminales FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.terminales TO transporte_runtime;
CREATE POLICY modificar ON transporte.terminales FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.rutas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.rutas FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.rutas TO transporte_runtime;
CREATE POLICY modificar ON transporte.rutas FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.ruta_paradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.ruta_paradas FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.ruta_paradas TO transporte_runtime;
CREATE POLICY modificar ON transporte.ruta_paradas FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.grupos_bus ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.grupos_bus FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.grupos_bus TO transporte_runtime;
CREATE POLICY modificar ON transporte.grupos_bus FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.grupo_dias_parada ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.grupo_dias_parada FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.grupo_dias_parada TO transporte_runtime;
CREATE POLICY modificar ON transporte.grupo_dias_parada FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.grupo_turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.grupo_turnos FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.grupo_turnos TO transporte_runtime;
CREATE POLICY modificar ON transporte.grupo_turnos FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.frecuencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.frecuencias FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.frecuencias TO transporte_runtime;
CREATE POLICY modificar ON transporte.frecuencias FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.frecuencia_grupo ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.frecuencia_grupo FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.frecuencia_grupo TO transporte_runtime;
CREATE POLICY modificar ON transporte.frecuencia_grupo FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.buses FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.buses TO transporte_runtime;
CREATE POLICY modificar ON transporte.buses FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.equipamientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.equipamientos FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.equipamientos TO transporte_runtime;
CREATE POLICY modificar ON transporte.equipamientos FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.bus_equipamiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.bus_equipamiento FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.bus_equipamiento TO transporte_runtime;
CREATE POLICY modificar ON transporte.bus_equipamiento FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.bus_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.bus_fotos FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.bus_fotos TO transporte_runtime;
CREATE POLICY modificar ON transporte.bus_fotos FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.clases_asiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.clases_asiento FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.clases_asiento TO transporte_runtime;
CREATE POLICY modificar ON transporte.clases_asiento FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.planos FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.planos TO transporte_runtime;
CREATE POLICY modificar ON transporte.planos FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.plano_celdas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.plano_celdas FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.plano_celdas TO transporte_runtime;
CREATE POLICY modificar ON transporte.plano_celdas FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.indisponibilidades_bus ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.indisponibilidades_bus FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.indisponibilidades_bus TO transporte_runtime;
CREATE POLICY modificar ON transporte.indisponibilidades_bus FOR ALL TO transporte_runtime USING(transporte.puede('flota.admin',cooperativa_id)) WITH CHECK(transporte.puede('flota.admin',cooperativa_id));
ALTER TABLE transporte.viajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.viajes FOR SELECT TO transporte_runtime USING(transporte.viaje_visible(id));
GRANT INSERT,UPDATE,DELETE ON transporte.viajes TO transporte_runtime;
CREATE POLICY modificar ON transporte.viajes FOR ALL TO transporte_runtime USING(transporte.puede('operacion.admin',cooperativa_id)) WITH CHECK(transporte.puede('operacion.admin',cooperativa_id));
ALTER TABLE transporte.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.bancos FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.bancos TO transporte_runtime;
CREATE POLICY modificar ON transporte.bancos FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.cuentas_bancarias FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.cuentas_bancarias TO transporte_runtime;
CREATE POLICY modificar ON transporte.cuentas_bancarias FOR ALL TO transporte_runtime USING(transporte.puede('pagos.configurar',cooperativa_id)) WITH CHECK(transporte.puede('pagos.configurar',cooperativa_id));
ALTER TABLE transporte.metodos_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.metodos_pago FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.metodos_pago TO transporte_runtime;
CREATE POLICY modificar ON transporte.metodos_pago FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.cooperativa_metodos_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.cooperativa_metodos_pago FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.cooperativa_metodos_pago TO transporte_runtime;
CREATE POLICY modificar ON transporte.cooperativa_metodos_pago FOR ALL TO transporte_runtime USING(transporte.puede('pagos.configurar',cooperativa_id)) WITH CHECK(transporte.puede('pagos.configurar',cooperativa_id));
ALTER TABLE transporte.politica_comprobantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.politica_comprobantes FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.politica_comprobantes TO transporte_runtime;
CREATE POLICY modificar ON transporte.politica_comprobantes FOR ALL TO transporte_runtime USING(transporte.puede('pagos.configurar',cooperativa_id)) WITH CHECK(transporte.puede('pagos.configurar',cooperativa_id));
ALTER TABLE transporte.impuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.impuestos FOR SELECT TO transporte_runtime USING(true);
GRANT INSERT,UPDATE,DELETE ON transporte.impuestos TO transporte_runtime;
CREATE POLICY modificar ON transporte.impuestos FOR ALL TO transporte_runtime USING(transporte.puede('config.global')) WITH CHECK(transporte.puede('config.global'));
ALTER TABLE transporte.beneficios ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.beneficios FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.beneficios TO transporte_runtime;
CREATE POLICY modificar ON transporte.beneficios FOR ALL TO transporte_runtime USING(transporte.puede('tarifas.admin',cooperativa_id)) WITH CHECK(transporte.puede('tarifas.admin',cooperativa_id));
ALTER TABLE transporte.tarifas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.tarifas FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.tarifas TO transporte_runtime;
CREATE POLICY modificar ON transporte.tarifas FOR ALL TO transporte_runtime USING(transporte.puede('tarifas.admin',cooperativa_id)) WITH CHECK(transporte.puede('tarifas.admin',cooperativa_id));
ALTER TABLE transporte.politicas_reembolso ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.politicas_reembolso FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
ALTER TABLE transporte.reglas_reembolso ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.reglas_reembolso FOR SELECT TO transporte_runtime USING(transporte.puede('cooperativa.leer',cooperativa_id));
GRANT INSERT,UPDATE,DELETE ON transporte.reglas_reembolso TO transporte_runtime;
CREATE POLICY modificar ON transporte.reglas_reembolso FOR ALL TO transporte_runtime USING(transporte.puede('tarifas.admin',cooperativa_id)) WITH CHECK(transporte.puede('tarifas.admin',cooperativa_id));
ALTER TABLE transporte.reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.reservas FOR SELECT TO transporte_runtime USING(transporte.reserva_visible(id));
ALTER TABLE transporte.reserva_asientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.reserva_asientos FOR SELECT TO transporte_runtime USING(transporte.reserva_visible(reserva_id));
ALTER TABLE transporte.pasajeros ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.pasajeros FOR SELECT TO transporte_runtime USING(transporte.asiento_reserva_visible(reserva_asiento_id));
ALTER TABLE transporte.cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.cotizaciones FOR SELECT TO transporte_runtime USING(transporte.reserva_visible(reserva_id));
ALTER TABLE transporte.cotizacion_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.cotizacion_lineas FOR SELECT TO transporte_runtime USING(transporte.cotizacion_visible(cotizacion_id));
ALTER TABLE transporte.intentos_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.intentos_pago FOR SELECT TO transporte_runtime USING(transporte.reserva_visible(reserva_id));
ALTER TABLE transporte.comprobantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.comprobantes FOR SELECT TO transporte_runtime USING(transporte.intento_visible(intento_id));
ALTER TABLE transporte.pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.pagos FOR SELECT TO transporte_runtime USING(transporte.reserva_visible(reserva_id));
ALTER TABLE transporte.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.compras FOR SELECT TO transporte_runtime USING(transporte.reserva_visible(reserva_id));
ALTER TABLE transporte.boletos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.boletos FOR SELECT TO transporte_runtime USING(transporte.compra_visible(compra_id));
ALTER TABLE transporte.notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.notificaciones FOR SELECT TO transporte_runtime USING(usuario_id=transporte.actor() OR transporte.puede('config.global'));
ALTER TABLE transporte.solicitudes_reembolso ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.solicitudes_reembolso FOR SELECT TO transporte_runtime USING(transporte.compra_visible(compra_id));
ALTER TABLE transporte.reembolsos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.reembolsos FOR SELECT TO transporte_runtime USING(transporte.puede('reembolsos.gestionar',cooperativa_id) OR EXISTS(SELECT 1 FROM transporte.solicitudes_reembolso sr WHERE sr.id=solicitud_id AND transporte.compra_visible(sr.compra_id)));
ALTER TABLE transporte.abordajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.abordajes FOR SELECT TO transporte_runtime USING(transporte.compra_visible(compra_id));
ALTER TABLE transporte.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.auditoria FOR SELECT TO transporte_runtime USING(transporte.puede('auditoria.leer',cooperativa_id));
ALTER TABLE transporte.contactos ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.contactos FOR SELECT TO transporte_runtime USING(transporte.puede('config.admin',cooperativa_id) OR transporte.puede('config.global'));
ALTER TABLE transporte.exportaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY leer ON transporte.exportaciones FOR SELECT TO transporte_runtime USING(solicitado_por=transporte.actor() OR transporte.puede('reportes.leer',cooperativa_id));

-- Usuarios: la API no permite cambiar activo/verificado mediante el formulario de perfil.
GRANT UPDATE(nombres,apellidos,email,telefono,nacimiento) ON transporte.usuarios TO transporte_runtime;
CREATE POLICY editar_perfil ON transporte.usuarios FOR UPDATE TO transporte_runtime USING(id=transporte.actor() OR transporte.puede('identidad.admin')) WITH CHECK(id=transporte.actor() OR transporte.puede('identidad.admin'));
GRANT INSERT ON transporte.archivos TO transporte_runtime;
CREATE POLICY registrar_archivo ON transporte.archivos FOR INSERT TO transporte_runtime WITH CHECK(propietario_id=transporte.actor() AND(cooperativa_id IS NULL OR EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id=cooperativa_id)));
-- Cambios administrativos complejos (altas, invitaciones, estado de usuario) usan servicio
-- de identidad y transacción con credencial de migrador/servicio de identidad, NO perfil público.
GRANT INSERT,DELETE ON transporte.politicas_reembolso TO transporte_runtime;
GRANT UPDATE(condiciones,plazo_abono_dias,permite_parcial) ON transporte.politicas_reembolso TO transporte_runtime;
CREATE POLICY modificar_politica ON transporte.politicas_reembolso FOR ALL TO transporte_runtime USING(estado='BORRADOR' AND transporte.puede('tarifas.admin',cooperativa_id)) WITH CHECK(estado='BORRADOR' AND transporte.puede('tarifas.admin',cooperativa_id));
-- Registro de contacto público por función; el rol de API no lee solicitudes ajenas.
CREATE FUNCTION transporte.enviar_contacto(p_coop uuid,p_nombre text,p_email text,p_asunto text,p_mensaje text,p_consentimiento text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE x uuid; BEGIN
 IF length(trim(p_nombre))=0 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(trim(p_asunto))=0 OR length(trim(p_mensaje))=0 OR length(trim(p_consentimiento))=0 THEN RAISE EXCEPTION 'Datos de contacto invalidos'; END IF;
 INSERT INTO transporte.contactos(cooperativa_id,nombre,email,asunto,mensaje,consentimiento_version) VALUES(p_coop,p_nombre,p_email,p_asunto,p_mensaje,p_consentimiento) RETURNING id INTO x; RETURN x; END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA transporte FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.actor(),transporte.puede(text,uuid,uuid),transporte.reserva_visible(uuid),transporte.compra_visible(uuid),transporte.usuario_visible(uuid),transporte.viaje_visible(uuid),transporte.intento_visible(uuid),transporte.asiento_reserva_visible(uuid),transporte.cotizacion_visible(uuid) TO transporte_runtime;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT oid::regprocedure sig FROM pg_proc WHERE pronamespace='transporte'::regnamespace AND proname=ANY(ARRAY['abrir_contexto','credencial_login','registrar_cliente','emitir_sesion_autenticada','reservar_asientos','guardar_pasajero','cotizar','aceptar_cotizacion','crear_intento_pago','registrar_comprobante','decidir_comprobante','cobrar_efectivo','publicar_politica_reembolso','elegibilidad_reembolso','solicitar_reembolso','decidir_reembolso','registrar_abono_reembolso','registrar_abordaje','cancelar_reserva_pendiente','marcar_boleto_emitido','buscar_viajes','cuentas_publicas','obtener_boleto','expirar_pendientes','enviar_contacto']) LOOP
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||p.sig||' TO transporte_runtime';
 END LOOP;
END $$;
-- Nunca otorgar al runtime propiedad, BYPASSRLS, CREATE, ni EXECUTE de confirmar_compra_interna.

CREATE FUNCTION transporte.cerrar_sesion(p_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
BEGIN UPDATE transporte.sesiones SET revocada_at=now() WHERE token_hash=p_hash AND usuario_id=transporte.actor(); END $$;

CREATE FUNCTION transporte.solicitar_recuperacion(p_email text,p_token_hash text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE uid uuid;
BEGIN
 IF p_token_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Hash de token no valido'; END IF;
 SELECT id INTO uid FROM transporte.usuarios WHERE lower(email)=lower(trim(p_email)) AND activo;
 IF uid IS NOT NULL THEN
  UPDATE transporte.tokens_identidad SET consumido_at=now() WHERE usuario_id=uid AND proposito='RECUPERACION' AND consumido_at IS NULL;
  INSERT INTO transporte.tokens_identidad(usuario_id,proposito,token_hash,expires_at) VALUES(uid,'RECUPERACION',p_token_hash,now()+interval '30 minutes');
 END IF;
 RETURN 'Si la cuenta existe, recibiras instrucciones.';
END $$;

CREATE FUNCTION transporte.restablecer_password(p_token_hash text,p_nuevo_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE t transporte.tokens_identidad;
BEGIN
 SELECT * INTO t FROM transporte.tokens_identidad WHERE token_hash=p_token_hash AND proposito='RECUPERACION' FOR UPDATE;
 IF t.id IS NULL OR t.consumido_at IS NOT NULL OR t.expires_at<=now() OR p_nuevo_hash NOT LIKE 'scrypt-v1$%' THEN RAISE EXCEPTION 'Token o nueva credencial no validos'; END IF;
 UPDATE transporte.credenciales SET password_hash=p_nuevo_hash,password_updated_at=now() WHERE usuario_id=t.usuario_id;
 IF NOT FOUND THEN INSERT INTO transporte.credenciales(usuario_id,password_hash) VALUES(t.usuario_id,p_nuevo_hash); END IF;
 UPDATE transporte.tokens_identidad SET consumido_at=now() WHERE id=t.id; UPDATE transporte.sesiones SET revocada_at=now() WHERE usuario_id=t.usuario_id AND revocada_at IS NULL;
END $$;

CREATE FUNCTION transporte.alta_cooperativa_responsable(p_coop jsonb,p_persona jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE cid uuid; uid uuid;
BEGIN
 PERFORM transporte.exigir('cooperativas.admin'); PERFORM transporte.exigir('identidad.admin');
 INSERT INTO transporte.cooperativas(nombre,razon_social,ruc) VALUES(p_coop->>'nombre',p_coop->>'razonSocial',p_coop->>'ruc') RETURNING id INTO cid;
 SELECT id INTO uid FROM transporte.usuarios WHERE lower(email)=lower(trim(p_persona->>'email'));
 IF uid IS NULL THEN
  INSERT INTO transporte.usuarios(nombres,apellidos,tipo_documento,documento,email,telefono) VALUES(p_persona->>'nombres',p_persona->>'apellidos',p_persona->>'tipoDocumento',p_persona->>'documento',lower(trim(p_persona->>'email')),p_persona->>'telefono') RETURNING id INTO uid;
 ELSIF NOT EXISTS(SELECT 1 FROM transporte.usuarios WHERE id=uid AND tipo_documento=p_persona->>'tipoDocumento' AND documento=p_persona->>'documento') THEN RAISE EXCEPTION 'Correo existente con otra identidad'; END IF;
 INSERT INTO transporte.membresias(cooperativa_id,usuario_id,rol_id) SELECT cid,uid,id FROM transporte.roles WHERE codigo='COOPERATIVA';
 INSERT INTO transporte.config_cooperativa(cooperativa_id) VALUES(cid); INSERT INTO transporte.politica_comprobantes(cooperativa_id) VALUES(cid);
 INSERT INTO transporte.cooperativa_metodos_pago(cooperativa_id,metodo_id) SELECT cid,id FROM transporte.metodos_pago;
 RETURN cid;
END $$;

CREATE FUNCTION transporte.alta_usuario_personal(p_persona jsonb,p_coop uuid,p_oficina uuid,p_rol text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE uid uuid; rol uuid;
BEGIN
 PERFORM transporte.exigir('identidad.admin');
 SELECT id INTO rol FROM transporte.roles WHERE codigo=p_rol AND ambito='COOPERATIVA'; IF rol IS NULL THEN RAISE EXCEPTION 'Rol de personal invalido'; END IF;
 SELECT id INTO uid FROM transporte.usuarios WHERE lower(email)=lower(trim(p_persona->>'email'));
 IF uid IS NULL THEN INSERT INTO transporte.usuarios(nombres,apellidos,tipo_documento,documento,email,telefono) VALUES(p_persona->>'nombres',p_persona->>'apellidos',p_persona->>'tipoDocumento',p_persona->>'documento',lower(trim(p_persona->>'email')),p_persona->>'telefono') RETURNING id INTO uid;
 ELSIF NOT EXISTS(SELECT 1 FROM transporte.usuarios WHERE id=uid AND tipo_documento=p_persona->>'tipoDocumento' AND documento=p_persona->>'documento') THEN RAISE EXCEPTION 'Identidad ya registrada con otros datos'; END IF;
 INSERT INTO transporte.membresias(cooperativa_id,usuario_id,oficina_id,rol_id) VALUES(p_coop,uid,p_oficina,rol); RETURN uid;
END $$;

CREATE FUNCTION transporte.cambiar_estado_usuario(p_usuario uuid,p_activo boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
BEGIN
 PERFORM transporte.exigir('identidad.admin');
 PERFORM 1 FROM transporte.roles WHERE codigo='ADMIN_SISTEMA' FOR UPDATE;
 IF NOT p_activo AND EXISTS(SELECT 1 FROM transporte.usuario_roles_globales ur JOIN transporte.roles ro ON ro.id=ur.rol_id WHERE ur.usuario_id=p_usuario AND ro.codigo='ADMIN_SISTEMA') AND(SELECT count(DISTINCT ur.usuario_id) FROM transporte.usuario_roles_globales ur JOIN transporte.roles ro ON ro.id=ur.rol_id JOIN transporte.usuarios u ON u.id=ur.usuario_id WHERE ro.codigo='ADMIN_SISTEMA' AND u.activo)<=1 THEN RAISE EXCEPTION 'No deshabilite al ultimo administrador'; END IF;
 UPDATE transporte.usuarios SET activo=p_activo WHERE id=p_usuario; IF NOT p_activo THEN UPDATE transporte.sesiones SET revocada_at=now() WHERE usuario_id=p_usuario AND revocada_at IS NULL; END IF;
END $$;

CREATE FUNCTION transporte.tomar_notificaciones(p_limite integer DEFAULT 20) RETURNS SETOF transporte.notificaciones LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
BEGIN
 PERFORM transporte.exigir('config.global');
 RETURN QUERY UPDATE transporte.notificaciones n SET estado='EN_PROCESO',intentos=intentos+1 WHERE n.id IN(SELECT id FROM transporte.notificaciones WHERE estado='PENDIENTE' AND disponible_at<=now() ORDER BY disponible_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_limite,1),100)) RETURNING n.*;
END $$;

CREATE FUNCTION transporte.resolver_notificacion(p_id uuid,p_exito boolean,p_referencia text,p_error text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
BEGIN
 PERFORM transporte.exigir('config.global'); UPDATE transporte.notificaciones SET estado=CASE WHEN p_exito THEN 'ENVIADA' ELSE 'FALLIDA' END,proveedor_ref=p_referencia,error_codigo=p_error WHERE id=p_id AND estado='EN_PROCESO';
END $$;

CREATE FUNCTION transporte.plano_disponible(p_viaje uuid,p_origen integer,p_destino integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE v transporte.viajes;
BEGIN
 SELECT * INTO v FROM transporte.viajes WHERE id=p_viaje AND estado='PUBLICADO' AND salida>now(); IF v.id IS NULL OR p_origen<0 OR p_destino<=p_origen THEN RAISE EXCEPTION 'Viaje o tramo no disponible'; END IF;
 RETURN(SELECT jsonb_build_object('planoId',v.plano_id,'celdas',jsonb_agg(jsonb_build_object('id',pc.id,'piso',pc.piso,'fila',pc.fila,'columna',pc.columna,'tipo',pc.tipo,'codigo',pc.codigo,'clase',cl.codigo,'estado',coalesce(oc.estado,'DISPONIBLE')) ORDER BY pc.piso,pc.fila,pc.columna)) FROM transporte.plano_celdas pc LEFT JOIN transporte.clases_asiento cl ON cl.id=pc.clase_id LEFT JOIN LATERAL(SELECT CASE WHEN a.estado='CONFIRMADO' THEN 'OCUPADO' WHEN r.cliente_id=transporte.actor() THEN 'SELECCIONADO' ELSE 'RESERVADO' END estado FROM transporte.reserva_asientos a JOIN transporte.reservas r ON r.id=a.reserva_id WHERE a.asiento_id=pc.id AND a.viaje_id=v.id AND(a.estado='CONFIRMADO' OR(a.estado='RETENIDO' AND a.expires_at>now())) AND int4range(a.origen_orden,a.destino_orden,'[)') && int4range(p_origen,p_destino,'[)') LIMIT 1)oc ON true WHERE pc.plano_id=v.plano_id AND pc.activa);
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA transporte FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.cerrar_sesion(text),transporte.solicitar_recuperacion(text,text),transporte.restablecer_password(text,text),transporte.alta_cooperativa_responsable(jsonb,jsonb),transporte.alta_usuario_personal(jsonb,uuid,uuid,text),transporte.cambiar_estado_usuario(uuid,boolean),transporte.tomar_notificaciones(integer),transporte.resolver_notificacion(uuid,boolean,text,text),transporte.plano_disponible(uuid,integer,integer) TO transporte_runtime;

-- Claves compuestas redundantes lógicamente, explícitas para relaciones1:1 de Prisma.
ALTER TABLE transporte.abordajes ADD UNIQUE(cooperativa_id,reserva_asiento_id);
ALTER TABLE transporte.boletos ADD UNIQUE(cooperativa_id,compra_id);
ALTER TABLE transporte.compras ADD UNIQUE(cooperativa_id,pago_id),ADD UNIQUE(cooperativa_id,reserva_id);
ALTER TABLE transporte.comprobantes ADD UNIQUE(cooperativa_id,intento_id);
ALTER TABLE transporte.pagos ADD UNIQUE(cooperativa_id,intento_id),ADD UNIQUE(cooperativa_id,reserva_id);
ALTER TABLE transporte.pasajeros ADD UNIQUE(cooperativa_id,reserva_asiento_id);
ALTER TABLE transporte.reembolsos ADD UNIQUE(cooperativa_id,solicitud_id);
-- Índices parciales de intentos/políticas/reembolsos siguen en SQL.
-- El postprocesador ORM mantiene sus relaciones como1:N (no unicidad histórica global).


COMMIT;
