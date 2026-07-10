const rawBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "https://filo-backend-57wx.onrender.com";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function apiUrl(path = "") {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}