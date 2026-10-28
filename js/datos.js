'use strict';

const Datos = (() => {
  function crearIniciales(hoy) {
    const dia = (desplazamiento) => Fechas.sumarDias(hoy, desplazamiento);
    const prestamo = (id, idLibro, persona, desdeHace, devueltoHace) => ({
      id,
      idLibro,
      persona,
      fechaPrestamo: dia(-desdeHace),
      fechaLimite: dia(-desdeHace + Logica.DIAS_PRESTAMO),
      fechaDevolucion: devueltoHace === null ? null : dia(-devueltoHace)
    });

    const libros = [
      { id: 'b-1', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', anio: 1967, genero: 'novela', coleccion: false, comentario: 'La saga de la familia Buendía en Macondo.' },
      { id: 'b-2', titulo: 'Breve historia del tiempo', autor: 'Stephen Hawking', anio: 1988, genero: 'ciencia', coleccion: false, comentario: 'Del big bang a los agujeros negros.' },
      { id: 'b-3', titulo: 'Sapiens: de animales a dioses', autor: 'Yuval Noah Harari', anio: 2011, genero: 'historia', coleccion: false, comentario: '' },
      { id: 'b-4', titulo: 'El Aleph', autor: 'Jorge Luis Borges', anio: 1949, genero: 'cuento', coleccion: false, comentario: 'Cuentos fantásticos sobre el infinito.' },
      { id: 'b-5', titulo: 'Cosmos', autor: 'Carl Sagan', anio: 1980, genero: 'ciencia', coleccion: false, comentario: '' },
      { id: 'b-6', titulo: 'Veinte poemas de amor y una canción desesperada', autor: 'Pablo Neruda', anio: 1924, genero: 'poesía', coleccion: true, comentario: 'Primera edición conservada en la sala de colecciones.' },
      { id: 'b-7', titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', anio: 1605, genero: 'novela', coleccion: true, comentario: 'Ejemplar de colección, solo para consulta en sala.' },
      { id: 'b-8', titulo: 'La sombra del viento', autor: 'Carlos Ruiz Zafón', anio: 2001, genero: 'novela', coleccion: false, comentario: '' },
      { id: 'b-9', titulo: 'Las venas abiertas de América Latina', autor: 'Eduardo Galeano', anio: 1971, genero: 'historia', coleccion: false, comentario: '' },
      { id: 'b-10', titulo: 'Cañas y barro', autor: 'Vicente Blasco Ibáñez', anio: 1902, genero: 'novela', coleccion: false, comentario: 'Vida de los pescadores de la Albufera.' }
    ];

    const prestamos = [

      prestamo('p-1', 'b-4', 'Ana', 20, null),
      prestamo('p-2', 'b-5', 'Carlos', 4, null),

      prestamo('p-3', 'b-1', 'Marta', 30, 20),
      prestamo('p-4', 'b-3', 'Luis', 40, 21)
    ];

    return { libros, prestamos };
  }

  return { crearIniciales };
})();
