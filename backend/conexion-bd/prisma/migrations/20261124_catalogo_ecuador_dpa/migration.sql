-- Catálogo oficial DPA del Ecuador: 24 provincias, 221 cantones y terminales terrestres por defecto.
-- Idempotente para ejecución segura en entornos existentes.

INSERT INTO transporte.provincias (nombre) VALUES
  ('Azuay'), ('Bolívar'), ('Cañar'), ('Carchi'), ('Chimborazo'), ('Cotopaxi'),
  ('El Oro'), ('Esmeraldas'), ('Galápagos'), ('Guayas'), ('Imbabura'), ('Loja'),
  ('Los Ríos'), ('Manabí'), ('Morona Santiago'), ('Napo'), ('Orellana'), ('Pastaza'),
  ('Pichincha'), ('Santa Elena'), ('Santo Domingo de los Tsáchilas'), ('Sucumbíos'),
  ('Tungurahua'), ('Zamora Chinchipe')
ON CONFLICT DO NOTHING;

INSERT INTO transporte.ciudades (nombre, provincia) VALUES
  ('Cuenca','Azuay'),('Girón','Azuay'),('Gualaceo','Azuay'),('Nabón','Azuay'),('Paute','Azuay'),
  ('Pucará','Azuay'),('San Fernando','Azuay'),('Santa Isabel','Azuay'),('Sígsig','Azuay'),('Oña','Azuay'),
  ('Chordeleg','Azuay'),('El Pan','Azuay'),('Sevilla de Oro','Azuay'),('Guachapala','Azuay'),('Camilo Ponce Enríquez','Azuay'),
  ('Guaranda','Bolívar'),('Chillanes','Bolívar'),('Chimbo','Bolívar'),('Echeandía','Bolívar'),('San Miguel','Bolívar'),
  ('Caluma','Bolívar'),('Las Naves','Bolívar'),
  ('Azogues','Cañar'),('Biblián','Cañar'),('Cañar','Cañar'),('La Troncal','Cañar'),('El Tambo','Cañar'),
  ('Déleg','Cañar'),('Suscal','Cañar'),
  ('Tulcán','Carchi'),('Bolívar','Carchi'),('Espejo','Carchi'),('Mira','Carchi'),('Montúfar','Carchi'),('San Pedro de Huaca','Carchi'),
  ('Riobamba','Chimborazo'),('Alausí','Chimborazo'),('Colta','Chimborazo'),('Chambo','Chimborazo'),('Chunchi','Chimborazo'),
  ('Guamote','Chimborazo'),('Guano','Chimborazo'),('Pallatanga','Chimborazo'),('Penipe','Chimborazo'),('Cumandá','Chimborazo'),
  ('Latacunga','Cotopaxi'),('La Maná','Cotopaxi'),('Pangua','Cotopaxi'),('Pujilí','Cotopaxi'),('Salcedo','Cotopaxi'),
  ('Saquisilí','Cotopaxi'),('Sigchos','Cotopaxi'),
  ('Machala','El Oro'),('Arenillas','El Oro'),('Atahualpa','El Oro'),('Balsas','El Oro'),('Chilla','El Oro'),
  ('El Guabo','El Oro'),('Huaquillas','El Oro'),('Marcabelí','El Oro'),('Pasaje','El Oro'),('Piñas','El Oro'),
  ('Portovelo','El Oro'),('Santa Rosa','El Oro'),('Zaruma','El Oro'),('Las Lajas','El Oro'),
  ('Esmeraldas','Esmeraldas'),('Eloy Alfaro','Esmeraldas'),('Muisne','Esmeraldas'),('Quinindé','Esmeraldas'),
  ('San Lorenzo','Esmeraldas'),('Atacames','Esmeraldas'),('Rioverde','Esmeraldas'),
  ('San Cristóbal','Galápagos'),('Isabela','Galápagos'),('Santa Cruz','Galápagos'),
  ('Guayaquil','Guayas'),('Alfredo Baquerizo Moreno','Guayas'),('Balao','Guayas'),('Balzar','Guayas'),('Colimes','Guayas'),
  ('Daule','Guayas'),('Durán','Guayas'),('El Empalme','Guayas'),('El Triunfo','Guayas'),('Milagro','Guayas'),
  ('Naranjal','Guayas'),('Naranjito','Guayas'),('Palestina','Guayas'),('Pedro Carbo','Guayas'),('Samborondón','Guayas'),
  ('Santa Lucía','Guayas'),('Salitre','Guayas'),('San Jacinto de Yaguachi','Guayas'),('Playas','Guayas'),('Simón Bolívar','Guayas'),
  ('Coronel Marcelino Maridueña','Guayas'),('Lomas de Sargentillo','Guayas'),('Nobol','Guayas'),('General Antonio Elizalde','Guayas'),('Isidro Ayora','Guayas'),
  ('Ibarra','Imbabura'),('Antonio Ante','Imbabura'),('Cotacachi','Imbabura'),('Otavalo','Imbabura'),('Pimampiro','Imbabura'),('San Miguel de Urcuquí','Imbabura'),
  ('Loja','Loja'),('Calvas','Loja'),('Catamayo','Loja'),('Celica','Loja'),('Chaguarpamba','Loja'),
  ('Espíndola','Loja'),('Gonzanamá','Loja'),('Macará','Loja'),('Paltas','Loja'),('Puyango','Loja'),
  ('Saraguro','Loja'),('Sozoranga','Loja'),('Zapotillo','Loja'),('Pindal','Loja'),('Quilanga','Loja'),('Olmedo','Loja'),
  ('Babahoyo','Los Ríos'),('Baba','Los Ríos'),('Montalvo','Los Ríos'),('Puebloviejo','Los Ríos'),('Quevedo','Los Ríos'),
  ('Urdaneta','Los Ríos'),('Ventanas','Los Ríos'),('Vinces','Los Ríos'),('Palenque','Los Ríos'),('Buena Fe','Los Ríos'),
  ('Valencia','Los Ríos'),('Mocache','Los Ríos'),('Quinsaloma','Los Ríos'),
  ('Portoviejo','Manabí'),('Bolívar','Manabí'),('Chone','Manabí'),('El Carmen','Manabí'),('Flavio Alfaro','Manabí'),
  ('Jipijapa','Manabí'),('Junín','Manabí'),('Manta','Manabí'),('Montecristi','Manabí'),('Paján','Manabí'),
  ('Pichincha','Manabí'),('Rocafuerte','Manabí'),('Santa Ana','Manabí'),('Sucre','Manabí'),('Tosagua','Manabí'),
  ('24 de Mayo','Manabí'),('Pedernales','Manabí'),('Olmedo','Manabí'),('Puerto López','Manabí'),('Jama','Manabí'),
  ('Jaramijó','Manabí'),('San Vicente','Manabí'),
  ('Morona (Macas)','Morona Santiago'),('Gualaquiza','Morona Santiago'),('Limón Indanza','Morona Santiago'),('Palora','Morona Santiago'),
  ('Santiago','Morona Santiago'),('Sucúa','Morona Santiago'),('Huamboya','Morona Santiago'),('San Juan Bosco','Morona Santiago'),
  ('Taisha','Morona Santiago'),('Logroño','Morona Santiago'),('Pablo Sexto','Morona Santiago'),('Tiwintza','Morona Santiago'),
  ('Tena','Napo'),('Archidona','Napo'),('El Chaco','Napo'),('Quijos','Napo'),('Carlos Julio Arosemena Tola','Napo'),
  ('Francisco de Orellana','Orellana'),('Aguarico','Orellana'),('La Joya de los Sachas','Orellana'),('Loreto','Orellana'),
  ('Pastaza (Puyo)','Pastaza'),('Mera','Pastaza'),('Santa Clara','Pastaza'),('Arajuno','Pastaza'),
  ('Quito','Pichincha'),('Cayambe','Pichincha'),('Mejía (Machachi)','Pichincha'),('Pedro Moncayo','Pichincha'),
  ('Rumiñahui (Sangolquí)','Pichincha'),('San Miguel de los Bancos','Pichincha'),('Pedro Vicente Maldonado','Pichincha'),('Puerto Quito','Pichincha'),
  ('Santa Elena','Santa Elena'),('La Libertad','Santa Elena'),('Salinas','Santa Elena'),
  ('Santo Domingo','Santo Domingo de los Tsáchilas'),('La Concordia','Santo Domingo de los Tsáchilas'),
  ('Nueva Loja (Lago Agrio)','Sucumbíos'),('Gonzalo Pizarro','Sucumbíos'),('Putumayo','Sucumbíos'),('Shushufindi','Sucumbíos'),
  ('Sucumbíos','Sucumbíos'),('Cascales','Sucumbíos'),('Cuyabeno','Sucumbíos'),
  ('Ambato','Tungurahua'),('Baños de Agua Santa','Tungurahua'),('Cevallos','Tungurahua'),('Mocha','Tungurahua'),
  ('Patate','Tungurahua'),('Quero','Tungurahua'),('San Pedro de Pelileo','Tungurahua'),('Santiago de Píllaro','Tungurahua'),('Tisaleo','Tungurahua'),
  ('Zamora','Zamora Chinchipe'),('Chinchipe','Zamora Chinchipe'),('Nangaritza','Zamora Chinchipe'),('Yacuambi','Zamora Chinchipe'),
  ('Yantzaza','Zamora Chinchipe'),('El Pangui','Zamora Chinchipe'),('Centinela del Cóndor','Zamora Chinchipe'),('Palanda','Zamora Chinchipe'),('Paquisha','Zamora Chinchipe')
ON CONFLICT (nombre, provincia) DO NOTHING;

UPDATE transporte.ciudades c
SET provincia_id = p.id
FROM transporte.provincias p
WHERE c.provincia_id IS NULL AND lower(trim(c.provincia)) = lower(p.nombre);

INSERT INTO transporte.terminales (ciudad_id, nombre)
SELECT c.id, 'Terminal Terrestre ' || c.nombre
FROM transporte.ciudades c
WHERE c.activa
  AND NOT EXISTS (
    SELECT 1 FROM transporte.terminales t
    WHERE t.ciudad_id = c.id AND t.activa
  )
ON CONFLICT (ciudad_id, nombre) DO NOTHING;
