import { create } from 'zustand';
import type { User, Agency } from '../types';
import i18n from '../i18n';

interface AuthState {
  token: string | null;
  user: User | null;
  agency: Agency | null;
  language: 'en' | 'ar';
  setAuth: (token: string, user: User, agency: Agency) => void;
  login: (token: string, user: User, agency: Agency) => void;
  logout: () => void;
  setLanguage: (lang: 'en' | 'ar') => void;
  hasPermission: (module: string, action: string) => boolean;
}

const savedToken = localStorage.getItem('rentease_token');
const savedUser = localStorage.getItem('rentease_user');
const savedAgency = localStorage.getItem('rentease_agency');
const savedLang = (localStorage.getItem('rentease_lang') as 'en' | 'ar') || 'en';

// Set initial direction
document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: savedToken,
  user: savedUser ? JSON.parse(savedUser) : null,
  agency: savedAgency ? JSON.parse(savedAgency) : null,
  language: savedLang,

  setAuth: (token, user, agency) => {
    localStorage.setItem('rentease_token', token);
    localStorage.setItem('rentease_user', JSON.stringify(user));
    localStorage.setItem('rentease_agency', JSON.stringify(agency));
    set({ token, user, agency });
  },

  login: (token, user, agency) => {
    get().setAuth(token, user, agency);
  },

  logout: () => {
    localStorage.removeItem('rentease_token');
    localStorage.removeItem('rentease_user');
    localStorage.removeItem('rentease_agency');
    set({ token: null, user: null, agency: null });
  },

  setLanguage: (lang) => {
    localStorage.setItem('rentease_lang', lang);
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    set({ language: lang });
  },

  hasPermission: (module: string, action: string) => {
    const { user } = get();
    if (!user) return false;
    // Check direct role string
    if (typeof user.role === 'string') {
      const r = (user.role as string).toUpperCase();
      if (r.includes('OWNER') || r.includes('ADMIN')) return true;
      // Non-owner/admin string roles: deny by default (fail-closed)
      return false;
    }
    // Check role object
    if (user.role && typeof user.role === 'object') {
      const roleName = (user.role.name || '').toLowerCase();
      if (roleName.includes('owner') || roleName.includes('admin')) return true;
      let perms = user.role.permissions;
      // Missing or null permissions = deny (fail-closed, not fail-open)
      if (!perms) return false;
      if (typeof perms === 'string') {
        try {
          perms = JSON.parse(perms);
        } catch {
          // Malformed permissions JSON = deny
          return false;
        }
      }
      if (Array.isArray(perms[module])) {
        return perms[module].includes(action) || perms[module].includes('*');
      }
      return Boolean(perms[module]?.[action] || perms[module]?.['*']);
    }
    // Unknown role shape = deny (fail-closed)
    return false;
  },
}));

export default useAuthStore;
