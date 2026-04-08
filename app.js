const STORAGE_KEY = "userSession";

const loginSection = document.getElementById("login-section");
const accountSection = document.getElementById("account-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const welcomeMessage = document.getElementById("welcome-message");
const notesField = document.getElementById("notes");
const saveStatus = document.getElementById("save-status");
const logoutBtn = document.getElementById("logout-btn");

function normalizePhone(phone) {
  return phone.replace(/\s+/g, "").trim();
}

function isValidPhone(phone) {
  return /^\+?[0-9]{8,15}$/.test(phone);
}

function renderAccount(session) {
  loginSection.classList.add("hidden");
  accountSection.classList.remove("hidden");

  welcomeMessage.textContent = `Bonjour ${session.firstName} ${session.lastName}`;
  notesField.value = session.notes || "";
  saveStatus.textContent = "";
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const formData = new FormData(loginForm);
  const firstName = (formData.get("firstName") || "").toString().trim();
  const lastName = (formData.get("lastName") || "").toString().trim();
  const phone = normalizePhone((formData.get("phone") || "").toString());

  if (!firstName || !lastName || !phone) {
    loginError.textContent = "Merci de remplir tous les champs.";
    return;
  }

  if (!isValidPhone(phone)) {
    loginError.textContent = "Numéro invalide (8 à 15 chiffres).";
    return;
  }

  const session = { firstName, lastName, phone, notes: "" };
  saveSession(session);
  renderAccount(session);
});

notesField.addEventListener("input", () => {
  const session = getSession();
  if (!session) return;

  session.notes = notesField.value;
  saveSession(session);
  saveStatus.textContent = "Note sauvegardée automatiquement.";
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  accountSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  loginForm.reset();
  saveStatus.textContent = "";
  loginError.textContent = "";
});

const existingSession = getSession();
if (existingSession) {
  renderAccount(existingSession);
}
