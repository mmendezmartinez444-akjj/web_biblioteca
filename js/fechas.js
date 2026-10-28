'use strict';

const Fechas = (() => {
  const MS_DIA = 24 * 60 * 60 * 1000;

  function dosDigitos(n) {
    return String(n).padStart(2, '0');
  }

  function aTexto(fecha) {
    return `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`;
  }

  function aMilisegundos(iso) {
    const [anio, mes, dia] = iso.split('-').map(Number);
    return Date.UTC(anio, mes - 1, dia);
  }

  function hoy() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
  }

  function sumarDias(iso, dias) {
    return aTexto(new Date(aMilisegundos(iso) + dias * MS_DIA));
  }

  function diasEntre(desde, hasta) {
    return Math.round((aMilisegundos(hasta) - aMilisegundos(desde)) / MS_DIA);
  }

  function formatear(iso) {
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  function esFechaIso(valor) {
    return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor);
  }

  return { hoy, sumarDias, diasEntre, formatear, esFechaIso };
})();
