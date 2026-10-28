'use strict';

const Almacen = (() => {
  const CLAVES = {
    libros: 'biblioteca.libros',
    prestamos: 'biblioteca.prestamos',
    tema: 'biblioteca.tema',
    usuario: 'biblioteca.usuario',
    orden: 'biblioteca.orden'
  };

  function leer(clave) {
    try {
      return window.localStorage.getItem(clave);
    } catch (error) {
      return null;
    }
  }

  function escribir(clave, valor) {
    try {
      window.localStorage.setItem(clave, valor);
      return true;
    } catch (error) {
      return false;
    }
  }

  function leerJson(clave) {
    const texto = leer(clave);
    if (texto === null) return null;
    try {
      return JSON.parse(texto);
    } catch (error) {
      return null;
    }
  }

  function cargarDatos() {
    const datos = { libros: leerJson(CLAVES.libros), prestamos: leerJson(CLAVES.prestamos) };
    return Logica.datosValidos(datos) ? datos : null;
  }

  function guardarDatos(estado) {
    escribir(CLAVES.libros, JSON.stringify(estado.libros));
    escribir(CLAVES.prestamos, JSON.stringify(estado.prestamos));
  }

  function cargarTema() {
    const tema = leer(CLAVES.tema);
    return tema === 'claro' || tema === 'oscuro' ? tema : null;
  }

  function guardarTema(tema) {
    escribir(CLAVES.tema, tema);
  }

  function cargarUsuario() {
    return leer(CLAVES.usuario) || '';
  }

  function guardarUsuario(nombre) {
    if (nombre) {
      escribir(CLAVES.usuario, nombre);
    } else {
      try {
        window.localStorage.removeItem(CLAVES.usuario);
      } catch (error) {

      }
    }
  }

  function cargarOrden() {
    const orden = leerJson(CLAVES.orden);
    if (orden && Logica.CAMPOS_ORDEN.includes(orden.campo) && Logica.DIRECCIONES.includes(orden.direccion)) {
      return { campo: orden.campo, direccion: orden.direccion };
    }
    return null;
  }

  function guardarOrden(orden) {
    escribir(CLAVES.orden, JSON.stringify(orden));
  }

  function borrarTodo() {
    Object.values(CLAVES).forEach((clave) => {
      try {
        window.localStorage.removeItem(clave);
      } catch (error) {

      }
    });
  }

  return {
    cargarDatos,
    guardarDatos,
    cargarTema,
    guardarTema,
    cargarUsuario,
    guardarUsuario,
    cargarOrden,
    guardarOrden,
    borrarTodo
  };
})();
