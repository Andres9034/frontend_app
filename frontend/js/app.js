/**
 * app.js
 * Para qué sirve: lógica del frontend. Habla con el backend por HTTP
 * (GET, POST, PUT, DELETE) y pinta la lista. No usa frameworks.
 *
 * Capa de presentación desacoplada: si el backend cambia de máquina
 * (Ubuntu <-> CentOS), solo se cambia API_BASE.
 */

// URL del API. En local apunta a esta misma PC.
// Cuando el backend viva en otra VM, cambia localhost por la IP de esa máquina.
const API_BASE = "http://localhost:8080/api/articulos";

const form = document.getElementById("form-articulo");
const cuerpoTabla = document.getElementById("cuerpo-tabla");
const estado = document.getElementById("estado");
const modoFormulario = document.getElementById("modo-formulario");
const campoId = document.getElementById("id");

/**
 * GET: pide todos los artículos y arma la tabla.
 */
async function cargarArticulos() {
  mostrarEstado("Cargando inventario…");
  try {
    const respuesta = await fetch(API_BASE);
    if (!respuesta.ok) {
      throw new Error("El backend respondió " + respuesta.status);
    }
    const articulos = await respuesta.json();
    pintarTabla(articulos);
    mostrarEstado("Hay " + articulos.length + " artículo(s).", "ok");
  } catch (error) {
    pintarTabla([]);
    mostrarEstado(
      "No se pudo hablar con el API. ¿Está corriendo el backend en el puerto 8080? " +
        error.message,
      "error"
    );
  }
}

/**
 * Pinta filas. Cada botón llama editar o eliminar.
 */
function pintarTabla(articulos) {
  cuerpoTabla.innerHTML = "";
  if (!articulos.length) {
    cuerpoTabla.innerHTML =
      '<tr><td colspan="6">No hay artículos todavía.</td></tr>';
    return;
  }

  articulos.forEach(function (articulo) {
    const fila = document.createElement("tr");
    fila.innerHTML =
      "<td>" +
      articulo.id +
      "</td>" +
      "<td>" +
      escapar(articulo.nombre) +
      "</td>" +
      "<td>" +
      escapar(articulo.categoria) +
      "</td>" +
      "<td>" +
      articulo.cantidad +
      "</td>" +
      "<td>$ " +
      Number(articulo.precio).toLocaleString("es-CO") +
      "</td>" +
      '<td>' +
      '<button type="button" class="boton" data-editar="' +
      articulo.id +
      '">Editar</button> ' +
      '<button type="button" class="boton peligro" data-eliminar="' +
      articulo.id +
      '">Borrar</button>' +
      "</td>";
    cuerpoTabla.appendChild(fila);
  });
}

/**
 * Submit del formulario: POST si no hay id, PUT si hay id (edición).
 */
form.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const articulo = {
    nombre: document.getElementById("nombre").value.trim(),
    categoria: document.getElementById("categoria").value.trim(),
    cantidad: Number(document.getElementById("cantidad").value),
    precio: Number(document.getElementById("precio").value),
  };

  const id = campoId.value;
  const url = id ? API_BASE + "/" + id : API_BASE;
  const metodo = id ? "PUT" : "POST";

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articulo),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(function () {
        return {};
      });
      throw new Error(cuerpo.error || "No se pudo guardar");
    }

    limpiarFormulario();
    await cargarArticulos();
    mostrarEstado(id ? "Artículo actualizado." : "Artículo creado.", "ok");
  } catch (error) {
    mostrarEstado(error.message, "error");
  }
});

/** Copia un artículo al formulario para hacer PUT. */
async function empezarEdicion(id) {
  try {
    const respuesta = await fetch(API_BASE + "/" + id);
    if (!respuesta.ok) {
      throw new Error("No se encontró el artículo");
    }
    const articulo = await respuesta.json();
    campoId.value = articulo.id;
    document.getElementById("nombre").value = articulo.nombre;
    document.getElementById("categoria").value = articulo.categoria;
    document.getElementById("cantidad").value = articulo.cantidad;
    document.getElementById("precio").value = articulo.precio;
    modoFormulario.textContent = "Modo: editando id " + articulo.id;
  } catch (error) {
    mostrarEstado(error.message, "error");
  }
}

/** DELETE: pide confirmación y borra. */
async function eliminarArticulo(id) {
  const seguro = window.confirm("¿Borrar el artículo " + id + "?");
  if (!seguro) {
    return;
  }
  try {
    const respuesta = await fetch(API_BASE + "/" + id, { method: "DELETE" });
    if (!respuesta.ok && respuesta.status !== 204) {
      throw new Error("No se pudo borrar");
    }
    if (campoId.value === String(id)) {
      limpiarFormulario();
    }
    await cargarArticulos();
    mostrarEstado("Artículo borrado.", "ok");
  } catch (error) {
    mostrarEstado(error.message, "error");
  }
}

function limpiarFormulario() {
  form.reset();
  campoId.value = "";
  modoFormulario.textContent = "Modo: crear nuevo";
}

function mostrarEstado(texto, tipo) {
  estado.textContent = texto;
  estado.className = "estado" + (tipo ? " " + tipo : "");
}

/** Evita que un nombre con < > rompa el HTML de la tabla. */
function escapar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

cuerpoTabla.addEventListener("click", function (evento) {
  const boton = evento.target.closest("button");
  if (!boton) {
    return;
  }
  if (boton.dataset.editar) {
    empezarEdicion(boton.dataset.editar);
  }
  if (boton.dataset.eliminar) {
    eliminarArticulo(boton.dataset.eliminar);
  }
});

document.getElementById("btn-cancelar").addEventListener("click", limpiarFormulario);
document.getElementById("btn-recargar").addEventListener("click", cargarArticulos);

// Al abrir la página se dispara el GET (el servicio básico que pide la práctica).
cargarArticulos();
