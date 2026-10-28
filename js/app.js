'use strict';

(() => {
  const VISTAS = ['catalogo', 'prestamos', 'libro', 'resumen'];
  const ORDEN_INICIAL = { campo: 'titulo', direccion: 'asc' };
  const $ = (id) => document.getElementById(id);

  let estado = { libros: [], prestamos: [] };

  const app = {
    vista: 'catalogo',
    busqueda: '',
    filtroEstado: 'todos',
    filtroGenero: 'todos',
    orden: { ...ORDEN_INICIAL },
    usuario: '',
    tema: 'claro',
    editandoId: null
    ,
    modalLibroId: null
  };

  function guardar() {
    Almacen.guardarDatos(estado);
  }

  function temaPorDefecto() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  function renderCatalogo(hoy) {
    const generos = Logica.generosDeLibros(estado.libros);
    if (app.filtroGenero !== 'todos' && !generos.includes(app.filtroGenero)) app.filtroGenero = 'todos';
    UI.renderGeneros(generos, app.filtroGenero);

    const filtrados = Logica.filtrarLibros(estado.libros, estado.prestamos, {
      busqueda: app.busqueda,
      estado: app.filtroEstado,
      genero: app.filtroGenero
    });
    const ordenados = Logica.ordenarLibros(filtrados, app.orden.campo, app.orden.direccion);
    UI.renderCatalogo(
      ordenados.map((libro) => Logica.vistaLibro(libro, estado.prestamos, hoy)),
      estado.libros.length
    );
  }

  function renderPrestamos(hoy) {
    const buscarLibro = (id) => estado.libros.find((l) => l.id === id);
    const activos = Logica.activosOrdenados(estado.prestamos)
      .filter((p) => buscarLibro(p.idLibro))
      .map((prestamo) => ({
        prestamo,
        libro: buscarLibro(prestamo.idLibro),
        vencido: Logica.estaVencido(prestamo, hoy),
        diasRetraso: Logica.diasRetraso(prestamo, hoy)
      }));
    const devueltos = Logica.historial(estado.prestamos)
      .filter((p) => buscarLibro(p.idLibro))
      .map((prestamo) => ({
        prestamo,
        libro: buscarLibro(prestamo.idLibro),
        retraso: Logica.diasRetraso(prestamo, hoy)
      }));
    UI.renderPrestamos(activos, devueltos, Logica.MAX_PRESTAMOS_ACTIVOS);
  }

  function render() {
    const hoy = Fechas.hoy();
    UI.renderMenu(Logica.prestamosActivos(estado.prestamos).length, app.usuario);
    renderCatalogo(hoy);
    renderPrestamos(hoy);
    UI.renderResumen(Logica.resumen(estado.libros, estado.prestamos, hoy));
  }

  function sincronizarControles() {
    UI.renderBusqueda(app.busqueda);
    UI.renderBotonesEstado(app.filtroEstado);
    UI.renderControlesOrden(app.orden);
    UI.renderUsuario(app.usuario);
    UI.aplicarTema(app.tema);
  }

  function vistaDesdeHash() {
    const nombre = window.location.hash.replace('#', '');
    return VISTAS.includes(nombre) ? nombre : 'catalogo';
  }

  function mostrarVista(nombre, { enfocar = true } = {}) {
    app.vista = nombre;
    UI.mostrarVista(nombre);
    if (!enfocar) return;
    window.scrollTo(0, 0);
    if (nombre === 'libro' && app.editandoId) {
      UI.enfocarCampo('titulo');
    } else {
      UI.enfocarTituloVista(nombre);
    }
  }

  function irA(nombre) {
    if (window.location.hash === `#${nombre}`) {
      mostrarVista(nombre);
    } else {
      window.location.hash = nombre;
    }
  }

  function tituloDe(idLibro) {
    const libro = estado.libros.find((l) => l.id === idLibro);
    return libro ? libro.titulo : '';
  }

  function completarPrestamo(idLibro, persona) {
    const resultado = Logica.prestar(estado, idLibro, persona, Fechas.hoy());
    if (!resultado.ok) {
      UI.mostrarMensaje('error', resultado.error);
      return;
    }
    guardar();
    render();
    UI.mostrarMensaje(
      'exito',
      `«${resultado.libro.titulo}» se prestó a ${resultado.prestamo.persona}. Devolver antes del ${Fechas.formatear(resultado.prestamo.fechaLimite)}.`
    );
  }

  function accionPrestar(idLibro) {
    const permitido = Logica.puedePrestar(estado, idLibro);
    if (!permitido.ok) {
      UI.mostrarMensaje('error', permitido.error);
      return;
    }
    app.modalLibroId = idLibro;
    UI.abrirModalPrestar(permitido.libro.titulo, app.usuario);
  }

  function accionDevolver(idLibro) {
    const resultado = Logica.devolver(estado, idLibro, Fechas.hoy());
    if (!resultado.ok) {
      UI.mostrarMensaje('error', resultado.error);
      return;
    }
    guardar();
    render();
    const titulo = resultado.libro.titulo;
    UI.mostrarMensaje(
      'exito',
      resultado.retraso > 0
        ? `«${titulo}» se devolvió con ${resultado.retraso} ${resultado.retraso === 1 ? 'día' : 'días'} de retraso.`
        : `«${titulo}» se devolvió a tiempo.`
    );
  }

  function accionEditar(idLibro) {
    const libro = estado.libros.find((l) => l.id === idLibro);
    if (!libro) return;
    app.editandoId = idLibro;
    UI.cargarFormulario(libro);
    UI.actualizarContador(Logica.COMENTARIO_MAX);
    UI.modoFormulario(true);
    irA('libro');
  }

  function accionEliminar(idLibro) {
    const libro = estado.libros.find((l) => l.id === idLibro);
    if (!libro) return;
    if (Logica.prestamoActivo(estado.prestamos, idLibro)) {
      UI.mostrarMensaje('error', `No se puede eliminar «${libro.titulo}» porque tiene un préstamo activo. Devuélvelo primero.`);
      return;
    }
    app.modalLibroId = idLibro;
    UI.abrirModalEliminar(libro.titulo);
  }

  function confirmarEliminar() {
    const idLibro = app.modalLibroId;
    UI.cerrarModal();
    app.modalLibroId = null;
    const resultado = Logica.eliminarLibro(estado, idLibro);
    if (!resultado.ok) {
      UI.mostrarMensaje('error', resultado.error);
      return;
    }
    if (app.editandoId === idLibro) cancelarEdicion();
    guardar();
    render();
    UI.mostrarMensaje('exito', `«${resultado.libro.titulo}» se eliminó junto con su historial de préstamos.`);
  }

  function enviarPrestamoDesdeModal() {
    const persona = Logica.validarPersona(UI.leerPersonaPrestar());
    if (!persona.valido) {
      UI.mostrarErrorPrestar(persona.error);
      return;
    }
    const idLibro = app.modalLibroId;
    UI.cerrarModal();
    app.modalLibroId = null;
    completarPrestamo(idLibro, persona.valor);
  }

  function cerrarModal() {
    UI.cerrarModal();
    app.modalLibroId = null;
  }

  function cancelarEdicion() {
    app.editandoId = null;
    UI.vaciarFormulario();
    UI.actualizarContador(Logica.COMENTARIO_MAX);
    UI.modoFormulario(false);
  }

  function enviarFormularioLibro(evento) {
    evento.preventDefault();
    const resultado = Logica.guardarLibro(estado, UI.leerFormulario(), app.editandoId);
    if (!resultado.ok) {
      if (resultado.errores.general) {
        UI.mostrarMensaje('error', resultado.errores.general);
        cancelarEdicion();
        return;
      }
      UI.mostrarErroresFormulario(resultado.errores);
      return;
    }
    guardar();
    cancelarEdicion();
    render();
    if (resultado.editado) {
      UI.mostrarMensaje('exito', `Se guardaron los cambios de «${resultado.libro.titulo}».`);
      irA('catalogo');
    } else {
      UI.mostrarMensaje('exito', `«${resultado.libro.titulo}» se agregó al catálogo.`);
      UI.enfocarCampo('titulo');
    }
  }

  function enviarFormularioUsuario(evento) {
    evento.preventDefault();
    const texto = $('campo-usuario').value.trim();
    if (texto !== '') {
      const validacion = Logica.validarPersona(texto);
      if (!validacion.valido) {
        UI.mostrarErrorUsuario(validacion.error);
        return;
      }
      app.usuario = validacion.valor;
    } else {
      app.usuario = '';
    }
    UI.mostrarErrorUsuario('');
    Almacen.guardarUsuario(app.usuario);
    UI.renderUsuario(app.usuario);
    UI.renderMenu(Logica.prestamosActivos(estado.prestamos).length, app.usuario);
    UI.mostrarMensaje('exito', app.usuario ? `Nombre guardado: ${app.usuario}.` : 'Se quitó el nombre de usuario.');
  }

  function alternarTema() {
    app.tema = app.tema === 'oscuro' ? 'claro' : 'oscuro';
    Almacen.guardarTema(app.tema);
    UI.aplicarTema(app.tema);
  }

  function restablecer() {
    Almacen.borrarTodo();
    estado = Datos.crearIniciales(Fechas.hoy());
    app.busqueda = '';
    app.filtroEstado = 'todos';
    app.filtroGenero = 'todos';
    app.orden = { ...ORDEN_INICIAL };
    app.usuario = '';
    app.tema = temaPorDefecto();
    cancelarEdicion();
    UI.mostrarErrorUsuario('');
    guardar();
    sincronizarControles();
    render();
    UI.mostrarMensaje('exito', 'La biblioteca se restableció a los libros y préstamos iniciales.');
  }

  function guardarOrden() {
    Almacen.guardarOrden(app.orden);
  }

  function iniciarEventos() {
    window.addEventListener('hashchange', () => mostrarVista(vistaDesdeHash()));

    $('busqueda').addEventListener('input', (evento) => {
      app.busqueda = evento.target.value;
      renderCatalogo(Fechas.hoy());
    });
    $('filtro-genero').addEventListener('change', (evento) => {
      app.filtroGenero = evento.target.value;
      renderCatalogo(Fechas.hoy());
    });
    document.querySelectorAll('[data-estado]').forEach((boton) => {
      boton.addEventListener('click', () => {
        app.filtroEstado = boton.dataset.estado;
        UI.renderBotonesEstado(app.filtroEstado);
        renderCatalogo(Fechas.hoy());
      });
    });
    $('orden-campo').addEventListener('change', (evento) => {
      app.orden.campo = evento.target.value;
      guardarOrden();
      renderCatalogo(Fechas.hoy());
    });
    document.querySelectorAll('input[name="orden-direccion"]').forEach((radio) => {
      radio.addEventListener('change', (evento) => {
        app.orden.direccion = evento.target.value;
        guardarOrden();
        renderCatalogo(Fechas.hoy());
      });
    });

    const acciones = {
      prestar: accionPrestar,
      devolver: accionDevolver,
      editar: accionEditar
      ,
      eliminar: accionEliminar
    };
    ['lista-libros', 'lista-prestamos'].forEach((id) => {
      $(id).addEventListener('click', (evento) => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton || boton.disabled) return;
        const accion = acciones[boton.dataset.accion];
        if (accion) accion(boton.dataset.id);
      });
    });

    $('formulario-libro').addEventListener('submit', enviarFormularioLibro);
    $('campo-comentario').addEventListener('input', () => UI.actualizarContador(Logica.COMENTARIO_MAX));
    ['titulo', 'autor', 'anio', 'genero', 'comentario'].forEach((campo) => {
      $(`campo-${campo}`).addEventListener('input', () => UI.limpiarErrorCampo(campo));
    });
    $('campo-coleccion').addEventListener('change', () => UI.limpiarErrorCampo('coleccion'));
    $('btn-cancelar-edicion').addEventListener('click', cancelarEdicion);

    $('formulario-usuario').addEventListener('submit', enviarFormularioUsuario);
    $('btn-restablecer').addEventListener('click', restablecer);
    document.querySelectorAll('[data-accion="tema"]').forEach((boton) => boton.addEventListener('click', alternarTema));

    document.querySelectorAll('[data-accion="cancelar-modal"]').forEach((boton) => boton.addEventListener('click', cerrarModal));
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (evento) => {
        if (evento.target === modal) cerrarModal();
      });
    });
    $('formulario-prestar').addEventListener('submit', (evento) => {
      evento.preventDefault();
      enviarPrestamoDesdeModal();
    });
    $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
    document.addEventListener('keydown', UI.atraparFoco);

    document.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Escape') return;
      if (UI.hayModalAbierto()) {
        cerrarModal();
        return;
      }
      if (app.vista === 'libro') {
        cancelarEdicion();
        UI.enfocarCampo('titulo');
      }
    });
  }

  function iniciar() {
    const guardado = Almacen.cargarDatos();
    estado = guardado || Datos.crearIniciales(Fechas.hoy());
    app.usuario = Almacen.cargarUsuario();
    app.orden = Almacen.cargarOrden() || { ...ORDEN_INICIAL };
    app.tema = Almacen.cargarTema() || temaPorDefecto();
    guardar();

    UI.renderOpcionesGenero(Logica.GENEROS);
    UI.actualizarContador(Logica.COMENTARIO_MAX);
    sincronizarControles();
    iniciarEventos();
    render();
    mostrarVista(vistaDesdeHash(), { enfocar: false });
  }

  iniciar();
})();
