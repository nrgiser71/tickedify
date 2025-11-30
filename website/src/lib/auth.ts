const AUTH_KEY = 'tickedify_admin_auth';
const SESSION_KEY = 'tickedify_admin_session';
const DEFAULT_PASSWORD = 'admin123'; // Default wachtwoord - MOET gewijzigd worden!

// Check of er een wachtwoord is ingesteld
export const hasPassword = (): boolean => {
  return localStorage.getItem(AUTH_KEY) !== null;
};

// Haal het opgeslagen wachtwoord op
const getStoredPassword = (): string => {
  return localStorage.getItem(AUTH_KEY) || DEFAULT_PASSWORD;
};

// Stel een nieuw wachtwoord in
export const setPassword = (newPassword: string): void => {
  localStorage.setItem(AUTH_KEY, newPassword);
};

// Controleer of gebruiker is ingelogd
export const isAuthenticated = (): boolean => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return false;

  try {
    const { timestamp } = JSON.parse(session);
    const now = Date.now();
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 uur

    return now - timestamp < sessionDuration;
  } catch {
    return false;
  }
};

// Login met wachtwoord
export const login = (password: string): boolean => {
  const storedPassword = getStoredPassword();

  if (password === storedPassword) {
    const session = {
      timestamp: Date.now(),
      authenticated: true
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }

  return false;
};

// Logout
export const logout = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

// Vernieuw sessie
export const refreshSession = (): void => {
  if (isAuthenticated()) {
    const session = {
      timestamp: Date.now(),
      authenticated: true
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
};

// Get het huidige wachtwoord (voor admin om te tonen)
export const getCurrentPassword = (): string => {
  return getStoredPassword();
};
