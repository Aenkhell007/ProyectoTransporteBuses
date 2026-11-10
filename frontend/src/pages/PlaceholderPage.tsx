interface PlaceholderPageProps {
  title: string;
  id?: string;
}

/** Espacio temporal que cada integrante sustituirá por el contenido de su vista. */
export function PlaceholderPage({ title, id }: PlaceholderPageProps) {
  return <section className="placeholder-page" id={id}><h1>{title}</h1></section>;
}
