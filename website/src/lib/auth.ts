const SESSION_KEY = 'tickedify_cms_session';

// Check of gebruiker is ingelogd (client-side cache)
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

// Check sessie bij server
export const checkSession = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/cms/session', {
      credentials: 'include'
    });
    const data = await response.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
};

// Login met wachtwoord via server API
export const login = async (password: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/cms/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      // Store local session cache
      const session = {
        timestamp: Date.now(),
        authenticated: true
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
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
