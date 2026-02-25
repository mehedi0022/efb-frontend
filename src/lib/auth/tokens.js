const customerTokenKey = 'token';
const customerRefreshTokenKey = 'refresh_token';
const adminTokenKey = 'auth_token';
const adminRefreshTokenKey = 'admin_refresh_token';

const isBrowser = () => typeof window !== 'undefined';

const read = (key) => {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
};

const write = (key, value) => {
  if (!isBrowser()) return;
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
};

export const tokenStorage = {
  getCustomerAccessToken: () => read(customerTokenKey),
  getCustomerRefreshToken: () => read(customerRefreshTokenKey),
  setCustomerTokens: ({ accessToken, refreshToken }) => {
    write(customerTokenKey, accessToken);
    write(customerRefreshTokenKey, refreshToken);
  },
  clearCustomerTokens: () => {
    write(customerTokenKey, null);
    write(customerRefreshTokenKey, null);
  },
  getAdminAccessToken: () => read(adminTokenKey),
  getAdminRefreshToken: () => read(adminRefreshTokenKey),
  setAdminTokens: ({ accessToken, refreshToken }) => {
    write(adminTokenKey, accessToken);
    write(adminRefreshTokenKey, refreshToken);
  },
  clearAdminTokens: () => {
    write(adminTokenKey, null);
    write(adminRefreshTokenKey, null);
  }
};
