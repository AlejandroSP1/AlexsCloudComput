// auth.js

// === Supabase config ===
const SUPABASE_URL = "https://prcgplilslpcluutzvwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByY2dwbGlsc2xwY2x1dXR6dndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUzNzUsImV4cCI6MjA3MDA4MTM3NX0.IGZDeF6EJagxOxm1OB2X3MdN8uQ0tRXhYT6hmkYYU1U";

// Crear cliente de Supabase
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mostrar/ocultar formularios de login y registro
function toggleForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  const loginHidden = loginForm.style.display === "none";
  loginForm.style.display = loginHidden ? "block" : "none";
  registerForm.style.display = loginHidden ? "none" : "block";
}

// Helper para alertas Bootstrap (si está disponible) o fallback simple
function showAlert(type = "info", message = "") {
  // type: 'success' | 'danger' | 'warning' | 'info'
  const container = document.getElementById("auth-container") || document.body;
  const wrapper = document.createElement("div");
  wrapper.style.marginTop = "10px";

  // Si hay Bootstrap, usa sus clases; si no, usa estilos básicos
  const isBootstrap = !!document.querySelector('[href*="bootstrap"]');
  if (isBootstrap) {
    wrapper.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show text-start" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
  } else {
    wrapper.innerHTML = `
      <div style="padding:10px;border-radius:6px;text-align:left;
                  background:${type === "success" ? "#d1fae5" : type === "danger" ? "#fee2e2" : "#e5e7eb"};
                  color:#111827;border:1px solid #d1d5db;">
        ${message}
      </div>`;
  }
  container.prepend(wrapper);

  // Autocierre en 4s
  setTimeout(() => wrapper.remove(), 4000);
}

// Registrar nuevo usuario
async function register() {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  if (!email || !password) {
    showAlert("warning", "Por favor ingresa correo y contraseña.");
    return;
  }

  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    showAlert("danger", "Error al registrarse: " + error.message);
    return;
  }

  showAlert("success", "Registro exitoso. Revisa tu correo si requiere confirmación.");
  // Cambiar a formulario de login
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  if (loginForm && registerForm) {
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  }
}

// Iniciar sesión
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showAlert("warning", "Por favor ingresa correo y contraseña.");
    return;
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    showAlert("danger", "Error al iniciar sesión: " + error.message);
    return;
  }

  showAlert("success", "Sesión iniciada. Redirigiendo...");
  try {
    // Guardar token (opcional)
    if (data?.session?.access_token) {
      localStorage.setItem("token", data.session.access_token);
    }
  } catch (_) {}
  // Redireccionar
  window.location.href = "dashboard.html";
}

// Redirigir si ya hay sesión activa
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await client.auth.getSession();
  if (data?.session) {
    window.location.href = "dashboard.html";
  }
});
