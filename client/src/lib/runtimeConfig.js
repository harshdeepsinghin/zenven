function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return "";
}

export function getSocketUrl() {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL;
  if (configuredSocketUrl) {
    return trimTrailingSlash(configuredSocketUrl);
  }

  return window.location.origin;
}
