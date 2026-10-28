'use strict';

const Logica = (() => {
  const DIAS_PRESTAMO = 14;
  const MAX_PRESTAMOS_ACTIVOS = 3;
  const PERSONA_MIN = 2;
  const PERSONA_MAX = 40;
  const TITULO_MIN = 3;
  const TITULO_MAX = 60;
  const ANIO_MIN = 1000;
  const ANIO_MAX = 2026;
  const COMENTARIO_MAX = 120;
  const GENEROS = ['novela', 'cuento', 'ciencia', 'historia', 'poesía', 'ensayo', 'otro'];
  const CAMPOS_ORDEN = ['titulo', 'autor', 'anio'];
  const DIRECCIONES = ['asc', 'desc'];

  const comparador = new Intl.Collator('es');

  function compararFechas(a, b) {
    if (a < b) return -1;
    return a > b ? 1 : 0;
  }

  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function limpiarEspacios(texto) {
    return String(texto).trim().replace(/\s+/g, ' ');
  }

  function claveDuplicado(titulo, autor) {
    return `${limpiarEspacios(titulo).toLowerCase()}|${limpiarEspacios(autor).toLowerCase()}`;
  }

  function nuevoId(prefijo) {
    return `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function prestamoActivo(prestamos, idLibro) {
    return prestamos.find((p) => p.idLibro === idLibro && p.fechaDevolucion === null) || null;
  }

  function prestamosActivos(prestamos) {
    return prestamos.filter((p) => p.fechaDevolucion === null);
  }

  function estaVencido(prestamo, hoy) {
    return prestamo.fechaDevolucion === null && prestamo.fechaLimite < hoy;
  }

  function diasRetraso(prestamo, hoy) {
    const hasta = prestamo.fechaDevolucion === null ? hoy : prestamo.fechaDevolucion;
    return Math.max(0, Fechas.diasEntre(prestamo.fechaLimite, hasta));
  }

  function estadoLibro(libro, prestamos) {
    if (libro.coleccion) return 'coleccion';
    return prestamoActivo(prestamos, libro.id) ? 'prestado' : 'disponible';
  }

  function vistaLibro(libro, prestamos, hoy) {
    const prestamo = prestamoActivo(prestamos, libro.id);
    return {
      libro,
      estado: estadoLibro(libro, prestamos),
      prestamo,
      vencido: prestamo ? estaVencido(prestamo, hoy) : false,
      diasRetraso: prestamo ? diasRetraso(prestamo, hoy) : 0
    };
  }

  function activosOrdenados(prestamos) {
    return prestamosActivos(prestamos).sort(
      (a, b) => compararFechas(a.fechaLimite, b.fechaLimite) || compararFechas(a.fechaPrestamo, b.fechaPrestamo)
    );
  }

  function historial(prestamos) {
    return prestamos
      .filter((p) => p.fechaDevolucion !== null)
      .sort(
        (a, b) => compararFechas(b.fechaDevolucion, a.fechaDevolucion) || compararFechas(b.fechaPrestamo, a.fechaPrestamo)
      );
  }

  function generosDeLibros(libros) {
    return [...new Set(libros.map((l) => l.genero))].sort((a, b) => comparador.compare(a, b));
  }

  function resumen(libros, prestamos, hoy) {
    const res = { total: libros.length, disponibles: 0, prestados: 0, vencidos: 0, coleccion: 0, porGenero: [] };
    const conteo = new Map();
    libros.forEach((libro) => {
      const vista = vistaLibro(libro, prestamos, hoy);
      if (vista.estado === 'disponible') res.disponibles += 1;
      if (vista.estado === 'coleccion') res.coleccion += 1;
      if (vista.estado === 'prestado') res.prestados += 1;
      if (vista.vencido) res.vencidos += 1;
      conteo.set(libro.genero, (conteo.get(libro.genero) || 0) + 1);
    });
    res.porGenero = [...conteo.entries()]
      .sort((a, b) => comparador.compare(a[0], b[0]))
      .map(([genero, cantidad]) => ({ genero, cantidad }));
    return res;
  }

  function filtrarLibros(libros, prestamos, { busqueda = '', estado = 'todos', genero = 'todos' } = {}) {
    const termino = normalizar(busqueda);
    return libros.filter((libro) => {
      if (termino && !normalizar(libro.titulo).includes(termino) && !normalizar(libro.autor).includes(termino)) {
        return false;
      }
      if (genero !== 'todos' && libro.genero !== genero) return false;
      const actual = estadoLibro(libro, prestamos);
      if (estado === 'disponibles' && actual !== 'disponible') return false;
      if (estado === 'prestados' && actual !== 'prestado') return false;
      return true;
    });
  }

  function ordenarLibros(libros, campo, direccion) {
    const campoValido = CAMPOS_ORDEN.includes(campo) ? campo : 'titulo';
    const signo = direccion === 'desc' ? -1 : 1;
    const comparar = (a, b) => {
      if (campoValido === 'anio') return a.anio - b.anio;
      return comparador.compare(a[campoValido], b[campoValido]);
    };
    return libros.slice().sort(
      (a, b) => comparar(a, b) * signo || comparador.compare(a.titulo, b.titulo) || comparador.compare(a.id, b.id)
    );
  }

  function validarPersona(nombre) {
    const valor = limpiarEspacios(nombre);
    if (valor.length < PERSONA_MIN || valor.length > PERSONA_MAX) {
      return { valido: false, valor, error: `El nombre debe tener entre ${PERSONA_MIN} y ${PERSONA_MAX} caracteres.` };
    }
    return { valido: true, valor, error: '' };
  }

  function validarLibro(datos, estado, idEditando) {
    const errores = {};
    const valores = {
      titulo: limpiarEspacios(datos.titulo || ''),
      autor: limpiarEspacios(datos.autor || ''),
      anio: String(datos.anio === undefined || datos.anio === null ? '' : datos.anio).trim(),
      genero: String(datos.genero || ''),
      comentario: String(datos.comentario || '').trim(),
      coleccion: Boolean(datos.coleccion)
    };

    if (valores.titulo.length < TITULO_MIN || valores.titulo.length > TITULO_MAX) {
      errores.titulo = `El título debe tener entre ${TITULO_MIN} y ${TITULO_MAX} caracteres.`;
    }
    if (valores.autor === '') {
      errores.autor = 'El autor no puede estar vacío.';
    }
    const anio = Number(valores.anio);
    if (valores.anio === '' || !Number.isInteger(anio) || anio < ANIO_MIN || anio > ANIO_MAX) {
      errores.anio = `El año debe ser un número entero entre ${ANIO_MIN} y ${ANIO_MAX}.`;
    }
    if (!GENEROS.includes(valores.genero)) {
      errores.genero = 'Selecciona un género de la lista.';
    }
    if (valores.comentario.length > COMENTARIO_MAX) {
      errores.comentario = `El comentario no puede superar los ${COMENTARIO_MAX} caracteres.`;
    }
    if (!errores.titulo && !errores.autor) {
      const clave = claveDuplicado(valores.titulo, valores.autor);
      const duplicado = estado.libros.some((l) => l.id !== idEditando && claveDuplicado(l.titulo, l.autor) === clave);
      if (duplicado) errores.titulo = 'Ya existe un libro con el mismo título y autor.';
    }
    if (valores.coleccion && idEditando && prestamoActivo(estado.prestamos, idEditando)) {
      errores.coleccion = 'Un libro con préstamo activo no puede marcarse como ejemplar de colección.';
    }
    valores.anio = anio;
    return { errores, valores };
  }

  function guardarLibro(estado, datos, idEditando = null) {
    const { errores, valores } = validarLibro(datos, estado, idEditando);
    if (Object.keys(errores).length > 0) return { ok: false, errores };

    if (idEditando) {
      const libro = estado.libros.find((l) => l.id === idEditando);
      if (!libro) return { ok: false, errores: { general: 'El libro que intentas editar ya no existe.' } };
      Object.assign(libro, valores);
      return { ok: true, libro, editado: true };
    }
    const libro = { id: nuevoId('b'), ...valores };
    estado.libros.push(libro);
    return { ok: true, libro, editado: false };
  }

  function puedePrestar(estado, idLibro) {
    const libro = estado.libros.find((l) => l.id === idLibro);
    if (!libro) return { ok: false, codigo: 'inexistente', error: 'El libro no existe.' };
    if (libro.coleccion) {
      return { ok: false, codigo: 'coleccion', error: `«${libro.titulo}» es un ejemplar de colección y no se presta.` };
    }
    if (prestamoActivo(estado.prestamos, idLibro)) {
      return { ok: false, codigo: 'prestado', error: `«${libro.titulo}» ya tiene un préstamo activo.` };
    }
    if (prestamosActivos(estado.prestamos).length >= MAX_PRESTAMOS_ACTIVOS) {
      return {
        ok: false,
        codigo: 'limite',
        error: `No se puede prestar «${libro.titulo}»: ya hay ${MAX_PRESTAMOS_ACTIVOS} préstamos activos, que es el máximo permitido.`
      };
    }
    return { ok: true, libro };
  }

  function prestar(estado, idLibro, persona, hoy) {
    const permitido = puedePrestar(estado, idLibro);
    if (!permitido.ok) return permitido;
    const validacion = validarPersona(persona);
    if (!validacion.valido) return { ok: false, codigo: 'persona', error: validacion.error };

    const prestamo = {
      id: nuevoId('p'),
      idLibro,
      persona: validacion.valor,
      fechaPrestamo: hoy,
      fechaLimite: Fechas.sumarDias(hoy, DIAS_PRESTAMO),
      fechaDevolucion: null
    };
    estado.prestamos.push(prestamo);
    return { ok: true, prestamo, libro: permitido.libro };
  }

  function devolver(estado, idLibro, hoy) {
    const libro = estado.libros.find((l) => l.id === idLibro);
    const prestamo = prestamoActivo(estado.prestamos, idLibro);
    if (!libro || !prestamo) return { ok: false, error: 'Ese libro no tiene un préstamo activo.' };
    prestamo.fechaDevolucion = hoy;
    return { ok: true, prestamo, libro, retraso: diasRetraso(prestamo, hoy) };
  }

  function eliminarLibro(estado, idLibro) {
    const libro = estado.libros.find((l) => l.id === idLibro);
    if (!libro) return { ok: false, codigo: 'inexistente', error: 'El libro no existe.' };
    if (prestamoActivo(estado.prestamos, idLibro)) {
      return {
        ok: false,
        codigo: 'prestado',
        error: `No se puede eliminar «${libro.titulo}» porque tiene un préstamo activo. Devuélvelo primero.`
      };
    }
    estado.libros = estado.libros.filter((l) => l.id !== idLibro);
    estado.prestamos = estado.prestamos.filter((p) => p.idLibro !== idLibro);
    return { ok: true, libro };
  }

  function datosValidos(datos) {
    if (!datos || !Array.isArray(datos.libros) || !Array.isArray(datos.prestamos)) return false;
    const idsLibros = new Set();
    for (const l of datos.libros) {
      if (!l || typeof l.id !== 'string' || idsLibros.has(l.id)) return false;
      if (typeof l.titulo !== 'string' || typeof l.autor !== 'string' || typeof l.genero !== 'string') return false;
      if (typeof l.anio !== 'number' || typeof l.coleccion !== 'boolean') return false;
      idsLibros.add(l.id);
    }
    const idsPrestamos = new Set();
    const librosConActivo = new Set();
    for (const p of datos.prestamos) {
      if (!p || typeof p.id !== 'string' || idsPrestamos.has(p.id)) return false;
      if (!idsLibros.has(p.idLibro) || typeof p.persona !== 'string') return false;
      if (!Fechas.esFechaIso(p.fechaPrestamo) || !Fechas.esFechaIso(p.fechaLimite)) return false;
      if (p.fechaDevolucion !== null && !Fechas.esFechaIso(p.fechaDevolucion)) return false;
      idsPrestamos.add(p.id);
      if (p.fechaDevolucion === null) {
        if (librosConActivo.has(p.idLibro)) return false;
        librosConActivo.add(p.idLibro);
      }
    }
    if (librosConActivo.size > MAX_PRESTAMOS_ACTIVOS) return false;
    return !datos.libros.some((l) => l.coleccion && librosConActivo.has(l.id));
  }

  return {
    DIAS_PRESTAMO,
    MAX_PRESTAMOS_ACTIVOS,
    PERSONA_MIN,
    PERSONA_MAX,
    COMENTARIO_MAX,
    GENEROS,
    CAMPOS_ORDEN,
    DIRECCIONES,
    prestamoActivo,
    prestamosActivos,
    estaVencido,
    diasRetraso,
    estadoLibro,
    vistaLibro,
    activosOrdenados,
    historial,
    generosDeLibros,
    resumen,
    filtrarLibros,
    ordenarLibros,
    validarPersona,
    validarLibro,
    guardarLibro,
    puedePrestar,
    prestar,
    devolver,
    eliminarLibro,
    datosValidos
  };
})();
