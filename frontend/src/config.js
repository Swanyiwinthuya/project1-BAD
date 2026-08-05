export const appConfig = {
  apiBase: '/campusfix/api',
  entra: {
    tenantId: 'c1f3dc23-b7f8-48d3-9b5d-2b12f158f01f',
    spaClientId: '1985266c-a070-4820-9141-154219cc6f7e',
    apiClientId: '0d198cfa-a73f-47a4-95f8-086d4bae50c6',
    scope: 'api://0d198cfa-a73f-47a4-95f8-086d4bae50c6/access_as_user'
  }
};

export const msalConfig = {
  auth: {
    clientId: appConfig.entra.spaClientId,
    authority: `https://login.microsoftonline.com/${appConfig.entra.tenantId}`,
    redirectUri: `${window.location.origin}/campusfix/`,
    postLogoutRedirectUri: `${window.location.origin}/campusfix/`
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
};

