import { POLITICA_PRIVACIDAD } from "./politicaPrivacidad";

const fechaFormateada = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(POLITICA_PRIVACIDAD.fecha));

export function ContenidoPoliticaPrivacidad() {
  return (
    <>
      <p>
        Versión {POLITICA_PRIVACIDAD.version} ·{" "}
        <time dateTime={POLITICA_PRIVACIDAD.fecha}>{fechaFormateada}</time>
      </p>
      {POLITICA_PRIVACIDAD.secciones.map(({ titulo, texto }) => (
        <p key={titulo}><strong>{titulo}. </strong>{texto}</p>
      ))}
      <p>
        <strong>Solicitud de eliminación. </strong>
        {POLITICA_PRIVACIDAD.solicitudEliminacion}{" "}
        <a className="underline" href={`mailto:${POLITICA_PRIVACIDAD.contacto}`}>
          {POLITICA_PRIVACIDAD.contacto}
        </a>.
      </p>
    </>
  );
}
