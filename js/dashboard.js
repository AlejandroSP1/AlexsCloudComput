// dashboard.js

// === Supabase config ===
const SUPABASE_URL = "https://prcgplilslpcluutzvwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByY2dwbGlsc2xwY2x1dXR6dndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUzNzUsImV4cCI6MjA3MDA4MTM3NX0.IGZDeF6EJagxOxm1OB2X3MdN8uQ0tRXhYT6hmkYYU1U";

// Crear cliente de Supabase
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Helpers UI (Bootstrap compatible) ---
function showAlert(type = "info", message = "") {
  const container = document.querySelector(".container") || document.body;
  const wrap = document.createElement("div");
  wrap.className = "mt-3";
  const isBootstrap = !!document.querySelector('[href*="bootstrap"]');

  if (isBootstrap) {
    wrap.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;
                  background:${type === "success" ? "#d1fae5" : type === "danger" ? "#fee2e2" : "#e5e7eb"};
                  color:#111827;">
        ${message}
      </div>`;
  }
  container.prepend(wrap);
  setTimeout(() => wrap.remove(), 4000);
}

function q(id) {
  return document.getElementById(id);
}

// --- Autenticación y carga inicial ---
document.addEventListener("DOMContentLoaded", async () => {
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session) {
    window.location.href = "index.html";
    return;
  }
  await cargarEstudiantes();
  await cargarSelectEstudiantes();
  await listarArchivos();

  // Delegación de eventos para editar/guardar/cancelar/eliminar
  const lista = q("lista-estudiantes");
  lista.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest("li");
    const id = li?.dataset?.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === "editar") activarEdicion(li);
    if (action === "cancelar") desactivarEdicion(li);
    if (action === "guardar") await guardarEdicion(li, id);
    if (action === "eliminar") await eliminarEstudiante(id);
  });
});

// --- Estudiantes CRUD ---
async function agregarEstudiante() {
  const nombre = q("nombre").value.trim();
  const correo = q("correo").value.trim();
  const clase = q("clase").value.trim();

  if (!nombre || !correo || !clase) {
    showAlert("warning", "Completa nombre, correo y clase.");
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    showAlert("danger", "No estás autenticado.");
    return;
  }

  const { error } = await client.from("estudiantes").insert({
    nombre, correo, clase, user_id: user.id,
  });

  if (error) {
    showAlert("danger", "Error al agregar: " + error.message);
    return;
  }

  q("nombre").value = "";
  q("correo").value = "";
  q("clase").value = "";

  showAlert("success", "Estudiante agregado.");
  await cargarEstudiantes();
  await cargarSelectEstudiantes();
}

async function cargarEstudiantes() {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    showAlert("danger", "Error al cargar estudiantes: " + error.message);
    return;
  }

  const lista = q("lista-estudiantes");
  lista.innerHTML = "";

  if (!data || data.length === 0) {
    lista.innerHTML = `<li class="list-group-item bg-transparent text-white-50">Sin registros</li>`;
    return;
  }

  data.forEach((est) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2";
    li.dataset.id = est.id;
    li.innerHTML = `
      <div class="w-100">
        <div class="d-flex flex-column flex-md-row gap-2">
          <span class="fw-bold me-2 est-nombre">${est.nombre}</span>
          <span class="text-break est-correo">${est.correo}</span>
          <span class="badge text-bg-info est-clase">${est.clase}</span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-warning" data-action="editar"><i class="bi bi-pencil-square"></i> Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-action="eliminar"><i class="bi bi-trash"></i> Eliminar</button>
      </div>
    `;
    q("lista-estudiantes").appendChild(li);
  });
}

function activarEdicion(li) {
  const nombre = li.querySelector(".est-nombre").textContent;
  const correo = li.querySelector(".est-correo").textContent;
  const clase = li.querySelector(".est-clase").textContent;

  li.classList.add("editing");
  li.querySelector(".w-100").innerHTML = `
    <div class="row g-2">
      <div class="col-12 col-md-4">
        <input class="form-control form-control-sm edit-nombre" value="${nombre}">
      </div>
      <div class="col-12 col-md-4">
        <input class="form-control form-control-sm edit-correo" value="${correo}">
      </div>
      <div class="col-12 col-md-4">
        <input class="form-control form-control-sm edit-clase" value="${clase}">
      </div>
    </div>
  `;
  const actions = li.querySelector("div.d-flex.gap-2");
  actions.innerHTML = `
    <button class="btn btn-sm btn-success" data-action="guardar"><i class="bi bi-check2"></i> Guardar</button>
    <button class="btn btn-sm btn-secondary" data-action="cancelar"><i class="bi bi-x-lg"></i> Cancelar</button>
  `;
}

function desactivarEdicion(li) {
  // Recargar por simplicidad
  cargarEstudiantes();
}

async function guardarEdicion(li, id) {
  const nombre = li.querySelector(".edit-nombre").value.trim();
  const correo = li.querySelector(".edit-correo").value.trim();
  const clase = li.querySelector(".edit-clase").value.trim();

  if (!nombre || !correo || !clase) {
    showAlert("warning", "Completa los campos antes de guardar.");
    return;
  }

  const { error } = await client
    .from("estudiantes")
    .update({ nombre, correo, clase })
    .eq("id", id);

  if (error) {
    showAlert("danger", "Error al actualizar: " + error.message);
    return;
  }

  showAlert("success", "Estudiante actualizado.");
  await cargarEstudiantes();
  await cargarSelectEstudiantes();
}

async function eliminarEstudiante(id) {
  if (!confirm("¿Eliminar este estudiante?")) return;

  const { error } = await client.from("estudiantes").delete().eq("id", id);

  if (error) {
    showAlert("danger", "Error al eliminar: " + error.message);
    return;
  }

  showAlert("success", "Estudiante eliminado.");
  await cargarEstudiantes();
  await cargarSelectEstudiantes();
}

// --- Select de estudiantes (para subir archivos) ---
async function cargarSelectEstudiantes() {
  const sel = q("estudiante");
  if (!sel) return;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { data, error } = await client
    .from("estudiantes")
    .select("id,nombre")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  sel.innerHTML = `<option value="">Selecciona un estudiante</option>`;

  if (error) return;

  (data || []).forEach((est) => {
    const opt = document.createElement("option");
    opt.value = est.id;
    opt.textContent = est.nombre;
    sel.appendChild(opt);
  });
}

// --- Storage: subir y listar archivos ---
async function subirArchivo() {
  const archivoInput = q("archivo");
  const estudianteId = q("estudiante")?.value || "";
  const archivo = archivoInput.files[0];

  if (!archivo) {
    showAlert("warning", "Selecciona un archivo primero.");
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    showAlert("danger", "Sesión no válida.");
    return;
  }

  // Ruta: userId/est_<id>/nombre.ext (si no hay estudiante, va directo a userId/)
  const folder = estudianteId ? `${user.id}/est_${estudianteId}` : `${user.id}`;
  const ruta = `${folder}/${Date.now()}_${archivo.name}`;

  const { error } = await client.storage
    .from("tareas")
    .upload(ruta, archivo, { cacheControl: "3600", upsert: false });

  if (error) {
    showAlert("danger", "Error al subir: " + error.message);
    return;
  }

  showAlert("success", "Archivo subido correctamente.");
  archivoInput.value = "";
  await listarArchivos();
}

async function listarArchivos() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return;

  const lista = q("archivos-subidos");
  lista.innerHTML = "";

  // Listar tanto raíz del usuario como subcarpetas (est_*).
  async function listFolder(prefix = `${user.id}`) {
    const { data, error } = await client.storage
      .from("tareas")
      .list(prefix, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    if (error) return [];

    // data puede contener archivos y/o carpetas
    const files = [];
    for (const item of data) {
      if (item.id && !item.name.endsWith("/")) {
        files.push({ name: item.name, path: `${prefix}/${item.name}` });
      } else if (item.name && item.name !== "" && !item.name.includes(".")) {
        // carpeta
        const sub = await listFolder(`${prefix}/${item.name}`);
        files.push(...sub);
      }
    }
    return files;
  }

  const files = await listFolder(`${user.id}`);

  if (files.length === 0) {
    lista.innerHTML = `<li class="list-group-item bg-transparent text-white-50">Sin archivos</li>`;
    return;
  }

  for (const f of files) {
    const { data: urlData, error: urlErr } = await client.storage
      .from("tareas")
      .createSignedUrl(f.path, 60 * 10); // 10 minutos

    if (urlErr) continue;

    const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
    const esPDF = /\.pdf$/i.test(f.name);

    const li = document.createElement("li");
    li.className = "list-group-item d-flex flex-column gap-1";
    li.innerHTML = `
      <strong class="text-break">${f.name}</strong>
      ${
        esImagen
          ? `<a href="${urlData.signedUrl}" target="_blank"><img src="${urlData.signedUrl}" class="img-fluid rounded" style="max-width:180px;"></a>`
          : esPDF
          ? `<a href="${urlData.signedUrl}" target="_blank" class="link-light">Ver PDF</a>`
          : `<a href="${urlData.signedUrl}" target="_blank" class="link-light">Descargar</a>`
      }
    `;
    lista.appendChild(li);
  }
}

// --- Cerrar sesión ---
async function cerrarSesion() {
  const { error } = await client.auth.signOut();
  if (error) {
    showAlert("danger", "Error al cerrar sesión: " + error.message);
    return;
  }
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// Exponer funciones al scope global (para botones inline)
window.agregarEstudiante = agregarEstudiante;
window.subirArchivo = subirArchivo;
window.cerrarSesion = cerrarSesion;
