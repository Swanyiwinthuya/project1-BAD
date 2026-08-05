import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { api } from './api.js';
import { appConfig, msalConfig } from './config.js';

const msal = new PublicClientApplication(msalConfig);
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await msal.initialize();
      const result = await msal.handleRedirectPromise();
      if (result?.account) msal.setActiveAccount(result.account);
      const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
      if (account) msal.setActiveAccount(account);

      if (sessionStorage.getItem('campusfix_token')) {
        try {
          const response = await api('/auth/me');
          if (active) setUser(response.user);
        } catch {
          sessionStorage.removeItem('campusfix_token');
        }
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, []);

  async function signIn() {
    const login = await msal.loginPopup({ scopes: [appConfig.entra.scope] });
    msal.setActiveAccount(login.account);
    const access = login.accessToken
      ? login
      : await msal.acquireTokenSilent({ account: login.account, scopes: [appConfig.entra.scope] });
    const response = await api('/auth/exchange', {
      method: 'POST',
      body: JSON.stringify({ accessToken: access.accessToken })
    });
    sessionStorage.setItem('campusfix_token', response.token);
    setUser(response.user);
  }

  async function signOut() {
    sessionStorage.removeItem('campusfix_token');
    setUser(null);
    const account = msal.getActiveAccount();
    if (account) await msal.logoutPopup({ account });
  }

  const value = useMemo(() => ({ user, ready, signIn, signOut, setUser }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
