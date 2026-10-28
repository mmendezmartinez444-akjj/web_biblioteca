'use strict';

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const CAMPOS_FORMULARIO = ['titulo', 'autor', 'anio', 'genero', 'comentario', 'coleccion'];
  const ETIQUETAS_ESTADO = { disponible: 'Disponible', prestado: 'Prestado', coleccion: 'De colección' };
  const DURACION_MENSAJE = 10000;
  let temporizadorMensaje = null;

  function el(etiqueta, opciones = {}, ...hijos) {
    const nodo = document.createElement(etiqueta);
    if (opciones.clase) nodo.className = opciones.clase;
    if (opciones.texto !== undefined) nodo.textContent = opciones.texto;
    Object.entries(opciones.attrs || {}).forEach(([nombre, valor]) => nodo.setAttribute(nombre, valor));
    hijos.forEach((hijo) => hijo && nodo.append(hijo));
    return nodo;
  }

  function plural(cantidad, singular, pluralTexto) {
    return cantidad === 1 ? singular : pluralTexto;
  }

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function textoDias(dias) {
    return `${dias} ${plural(dias, 'día', 'días')}`;
  }

  function mostrarVista(nombre) {
    document.querySelectorAll('.vista').forEach((seccion) => {
      seccion.hidden = seccion.dataset.vista !== nombre;
    });
    document.querySelectorAll('.menu__enlace').forEach((enlace) => {
      const activo = enlace.dataset.vista === nombre;
      enlace.classList.toggle('activo', activo);
      if (activo) {
        enlace.setAttribute('aria-current', 'page');
      } else {
        enlace.removeAttribute('aria-current');
      }
    });
  }

  function enfocarTituloVista(nombre) {
    const titulo = document.querySelector(`.vista[data-vista="${nombre}"] .vista__titulo`);
    if (titulo) titulo.focus({ preventScroll: true });
  }

  function limpiarMensaje() {
    window.clearTimeout(temporizadorMensaje);
    $('mensaje').replaceChildren();
  }

  function mostrarMensaje(tipo, texto) {
    window.clearTimeout(temporizadorMensaje);
    const cerrar = el('button', { clase: 'mensaje__cerrar', texto: '×', attrs: { type: 'button', 'aria-label': 'Cerrar mensaje' } });
    cerrar.addEventListener('click', limpiarMensaje);
    $('mensaje').replaceChildren(el('div', { clase: `mensaje__caja mensaje__caja--${tipo}` }, el('p', { clase: 'mensaje__texto', texto }), cerrar));
    temporizadorMensaje = window.setTimeout(limpiarMensaje, DURACION_MENSAJE);
  }

  function renderMenu(cantidadActivos, usuario) {
    $('contador-prestamos').textContent = `(${cantidadActivos})`;
    $('saludo').textContent = `Hola, ${usuario || 'visitante'}`;
  }

  function aplicarTema(tema) {
    document.documentElement.dataset.tema = tema;
    const siguiente = tema === 'oscuro' ? 'claro' : 'oscuro';
    document.querySelectorAll('[data-accion="tema"]').forEach((boton) => {
      boton.textContent = boton.dataset.formato === 'corto' ? `Tema ${siguiente}` : `Cambiar a tema ${siguiente}`;
    });
  }

  function renderGeneros(generos, seleccionado) {
    const select = $('filtro-genero');
    const opciones = [el('option', { texto: 'Todos los géneros', attrs: { value: 'todos' } })];
    generos.forEach((genero) => opciones.push(el('option', { texto: capitalizar(genero), attrs: { value: genero } })));
    select.replaceChildren(...opciones);
    select.value = seleccionado;
  }

  function renderBotonesEstado(estado) {
    document.querySelectorAll('[data-estado]').forEach((boton) => {
      const activo = boton.dataset.estado === estado;
      boton.classList.toggle('activo', activo);
      boton.setAttribute('aria-pressed', String(activo));
    });
  }

  function renderControlesOrden(orden) {
    $('orden-campo').value = orden.campo;
    document.querySelectorAll('input[name="orden-direccion"]').forEach((radio) => {
      radio.checked = radio.value === orden.direccion;
    });
  }

  function crearBoton(texto, accion, id, opciones = {}) {
    const boton = el('button', {
      clase: `boton ${opciones.clase || 'boton--secundario'} boton--pequeno`,
      texto,
      attrs: { type: 'button', 'data-accion': accion, 'data-id': id, 'aria-label': `${texto} «${opciones.titulo}»` }
    });
    if (opciones.deshabilitado) boton.disabled = true;
    return boton;
  }

  function crearTarjeta({ libro, estado, prestamo, vencido, diasRetraso }) {
    const clases = ['tarjeta', `tarjeta--${estado}`];
    if (vencido) clases.push('tarjeta--vencida');

    const etiquetas = el('div', { clase: 'etiquetas' }, el('span', { clase: `etiqueta etiqueta--${estado}`, texto: ETIQUETAS_ESTADO[estado] }));
    if (vencido) etiquetas.append(el('span', { clase: 'etiqueta etiqueta--vencido', texto: 'Vencido' }));

    const detalles = el('div', { clase: 'tarjeta__detalles' });
    if (prestamo) {
      detalles.append(el('p', { texto: `Prestado a ${prestamo.persona}` }));
      detalles.append(el('p', { texto: `Devolver antes del ${Fechas.formatear(prestamo.fechaLimite)}` }));
      if (vencido) detalles.append(el('p', { clase: 'texto-alerta', texto: `Retraso: ${textoDias(diasRetraso)}` }));
    }

    const acciones = el('div', { clase: 'tarjeta__acciones' });
    acciones.append(crearBoton('Editar', 'editar', libro.id, { clase: 'boton--texto', titulo: libro.titulo }));
    acciones.append(crearBoton('Eliminar', 'eliminar', libro.id, { clase: 'boton--texto boton--texto-peligro', titulo: libro.titulo }));
    if (estado === 'prestado') {
      acciones.append(crearBoton('Devolver', 'devolver', libro.id, { clase: 'boton--primario', titulo: libro.titulo }));
    } else {
      acciones.append(crearBoton('Prestar', 'prestar', libro.id, { clase: 'boton--primario', titulo: libro.titulo, deshabilitado: estado === 'coleccion' }));
    }

    const inicial = Array.from(libro.titulo.trim())[0] || '?';
    const lomo = el(
      'div',
      { clase: 'tarjeta__lomo', attrs: { 'aria-hidden': 'true' } },
      el('span', { clase: 'tarjeta__inicial', texto: inicial.toUpperCase() }),
      el('span', { clase: 'tarjeta__anio', texto: String(libro.anio) })
    );

    return el(
      'article',
      { clase: clases.join(' '), attrs: { 'data-id': libro.id } },
      lomo,
      el(
        'div',
        { clase: 'tarjeta__cuerpo' },
        el('h3', { clase: 'tarjeta__titulo', texto: libro.titulo }),
        el('p', { clase: 'tarjeta__autor', texto: `de ${libro.autor}` }),
        el(
          'dl',
          { clase: 'tarjeta__meta' },
          el('div', {}, el('dt', { texto: 'Año' }), el('dd', { texto: String(libro.anio) })),
          el('div', {}, el('dt', { texto: 'Género' }), el('dd', { texto: capitalizar(libro.genero) }))
        ),
        etiquetas,
        libro.comentario ? el('p', { clase: 'tarjeta__comentario', texto: libro.comentario }) : null,
        detalles,
        acciones
      )
    );
  }

  function renderCatalogo(elementos, totalLibros) {
    $('lista-libros').replaceChildren(...elementos.map(crearTarjeta));
    $('contador-libros').textContent = `Mostrando ${elementos.length} de ${totalLibros} ${plural(totalLibros, 'libro', 'libros')}`;
    const vacio = $('vacio-libros');
    vacio.hidden = elementos.length > 0;
    vacio.textContent = totalLibros === 0 ? 'La biblioteca no tiene libros todavía.' : 'Ningún libro coincide con la búsqueda y los filtros activos.';
  }

  function renderPrestamos(activos, devueltos, maximo) {
    $('cupo-prestamos').textContent = `Préstamos activos: ${activos.length} de ${maximo} permitidos`;

    $('lista-prestamos').replaceChildren(
      ...activos.map(({ prestamo, libro, vencido, diasRetraso }) => {
        const etiquetas = el('div', { clase: 'etiquetas' });
        if (vencido) etiquetas.append(el('span', { clase: 'etiqueta etiqueta--vencido', texto: 'Vencido' }));
        return el(
          'li',
          { clase: `item${vencido ? ' item--vencido' : ''}` },
          el(
            'div',
            { clase: 'item__cuerpo' },
            el('h4', { clase: 'item__titulo', texto: libro.titulo }),
            el('p', { texto: `Prestado a ${prestamo.persona}` }),
            el('p', { texto: `Fecha límite: ${Fechas.formatear(prestamo.fechaLimite)}` }),
            vencido ? el('p', { clase: 'texto-alerta', texto: `Retraso: ${textoDias(diasRetraso)}` }) : null,
            etiquetas
          ),
          crearBoton('Devolver', 'devolver', libro.id, { clase: 'boton--primario', titulo: libro.titulo })
        );
      })
    );
    $('vacio-prestamos').hidden = activos.length > 0;

    $('lista-historial').replaceChildren(
      ...devueltos.map(({ prestamo, libro, retraso }) =>
        el(
          'li',
          { clase: 'item' },
          el(
            'div',
            { clase: 'item__cuerpo' },
            el('h4', { clase: 'item__titulo', texto: libro.titulo }),
            el('p', { texto: `Persona: ${prestamo.persona}` }),
            el('p', { texto: `Prestado el ${Fechas.formatear(prestamo.fechaPrestamo)} · Devuelto el ${Fechas.formatear(prestamo.fechaDevolucion)}` }),
            el(
              'div',
              { clase: 'etiquetas' },
              retraso > 0
                ? el('span', { clase: 'etiqueta etiqueta--retraso', texto: `Con retraso (${textoDias(retraso)})` })
                : el('span', { clase: 'etiqueta etiqueta--disponible', texto: 'A tiempo' })
            )
          )
        )
      )
    );
    $('vacio-historial').hidden = devueltos.length > 0;
  }

  function renderOpcionesGenero(generos) {
    const select = $('campo-genero');
    select.replaceChildren(
      el('option', { texto: 'Selecciona un género', attrs: { value: '' } }),
      ...generos.map((genero) => el('option', { texto: capitalizar(genero), attrs: { value: genero } }))
    );
  }

  function leerFormulario() {
    return {
      titulo: $('campo-titulo').value,
      autor: $('campo-autor').value,
      anio: $('campo-anio').value,
      genero: $('campo-genero').value,
      comentario: $('campo-comentario').value,
      coleccion: $('campo-coleccion').checked
    };
  }

  function actualizarContador(maximo) {
    const restantes = maximo - $('campo-comentario').value.length;
    $('restantes-comentario').textContent = `Quedan ${restantes} ${plural(restantes, 'carácter', 'caracteres')}`;
  }

  function limpiarErrorCampo(campo) {
    const error = $(`error-${campo}`);
    if (error) error.textContent = '';
    const control = $(`campo-${campo}`);
    if (control) control.removeAttribute('aria-invalid');
  }

  function limpiarErroresFormulario() {
    CAMPOS_FORMULARIO.forEach(limpiarErrorCampo);
  }

  function mostrarErroresFormulario(errores) {
    let primero = null;
    CAMPOS_FORMULARIO.forEach((campo) => {
      if (!errores[campo]) return;
      $(`error-${campo}`).textContent = errores[campo];
      $(`campo-${campo}`).setAttribute('aria-invalid', 'true');
      if (!primero) primero = $(`campo-${campo}`);
    });
    if (primero) primero.focus();
  }

  function cargarFormulario(libro) {
    $('campo-titulo').value = libro.titulo;
    $('campo-autor').value = libro.autor;
    $('campo-anio').value = libro.anio;
    $('campo-genero').value = libro.genero;
    $('campo-comentario').value = libro.comentario || '';
    $('campo-coleccion').checked = libro.coleccion;
    limpiarErroresFormulario();
  }

  function vaciarFormulario() {
    $('formulario-libro').reset();
    limpiarErroresFormulario();
  }

  function modoFormulario(editando) {
    $('titulo-libro').textContent = editando ? 'Editar libro' : 'Agregar libro';
    $('btn-guardar').textContent = editando ? 'Guardar cambios' : 'Agregar libro';
    $('btn-cancelar-edicion').hidden = !editando;
  }

  function enfocarCampo(campo) {
    $(`campo-${campo}`).focus();
  }

  function renderResumen(resumen) {
    const estadisticas = [
      ['Total de libros', resumen.total],
      ['Disponibles', resumen.disponibles],
      ['Prestados', resumen.prestados],
      ['Vencidos', resumen.vencidos],
      ['De colección', resumen.coleccion]
    ];
    $('resumen-estadisticas').replaceChildren(
      ...estadisticas.map(([etiqueta, valor]) =>
        el('li', { clase: 'estadistica' }, el('span', { clase: 'estadistica__valor', texto: String(valor) }), el('span', { clase: 'estadistica__etiqueta', texto: etiqueta }))
      )
    );
    $('resumen-generos').replaceChildren(
      ...resumen.porGenero.map(({ genero, cantidad }) =>
        el('li', { clase: 'fila' }, el('span', { texto: capitalizar(genero) }), el('strong', { texto: String(cantidad) }))
      )
    );
    $('vacio-generos').hidden = resumen.porGenero.length > 0;
  }

  function renderUsuario(nombre) {
    $('campo-usuario').value = nombre;
  }

  function mostrarErrorUsuario(texto) {
    $('error-usuario').textContent = texto;
    if (texto) {
      $('campo-usuario').setAttribute('aria-invalid', 'true');
      $('campo-usuario').focus();
    } else {
      $('campo-usuario').removeAttribute('aria-invalid');
    }
  }

  function renderBusqueda(texto) {
    $('busqueda').value = texto;
  }

  let modalAbierto = null;
  let elementoPrevio = null;

  const SELECTOR_ENFOCABLES = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]';

  function abrirModal(modal, elementoInicial) {
    elementoPrevio = document.activeElement;
    modalAbierto = modal;
    modal.hidden = false;
    elementoInicial.focus();
  }

  function cerrarModal() {
    if (!modalAbierto) return;
    modalAbierto.hidden = true;
    modalAbierto = null;
    if (elementoPrevio && document.contains(elementoPrevio)) {
      elementoPrevio.focus();
    } else {
      $('contenido').focus({ preventScroll: true });
    }
    elementoPrevio = null;
  }

  function hayModalAbierto() {
    return modalAbierto !== null;
  }

  function atraparFoco(evento) {
    if (!modalAbierto || evento.key !== 'Tab') return;
    const enfocables = modalAbierto.querySelectorAll(SELECTOR_ENFOCABLES);
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  function abrirModalPrestar(titulo, nombrePrellenado) {
    $('modal-prestar-libro').textContent = `Libro: «${titulo}»`;
    $('prestar-persona').value = nombrePrellenado;
    mostrarErrorPrestar('');
    abrirModal($('modal-prestar'), $('prestar-persona'));
    $('prestar-persona').select();
  }

  function leerPersonaPrestar() {
    return $('prestar-persona').value;
  }

  function mostrarErrorPrestar(texto) {
    $('error-prestar').textContent = texto;
    if (texto) {
      $('prestar-persona').setAttribute('aria-invalid', 'true');
      $('prestar-persona').focus();
    } else {
      $('prestar-persona').removeAttribute('aria-invalid');
    }
  }

  function abrirModalEliminar(titulo) {
    $('modal-eliminar-titulo').textContent = `¿Eliminar «${titulo}»?`;
    abrirModal($('modal-eliminar'), document.querySelector('#modal-eliminar [data-accion="cancelar-modal"]'));
  }

  return {
    mostrarVista,
    enfocarTituloVista,
    mostrarMensaje,
    limpiarMensaje,
    renderMenu,
    aplicarTema,
    renderGeneros,
    renderBotonesEstado,
    renderControlesOrden,
    renderBusqueda,
    renderCatalogo,
    renderPrestamos,
    renderOpcionesGenero,
    leerFormulario,
    actualizarContador,
    limpiarErrorCampo,
    limpiarErroresFormulario,
    mostrarErroresFormulario,
    cargarFormulario,
    vaciarFormulario,
    modoFormulario,
    enfocarCampo,
    renderResumen,
    renderUsuario,
    mostrarErrorUsuario,
    hayModalAbierto,
    cerrarModal,
    atraparFoco,
    abrirModalPrestar,
    leerPersonaPrestar,
    mostrarErrorPrestar,
    abrirModalEliminar
  };
})();
