const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

// Geliştirmede istekleri Vite proxy üzerinden geçirmek CORS sorunlarını önler.
// Production build'de tanımlı Render/API adresi kullanılmaya devam eder.
const rawBaseUrl = import.meta.env.DEV ? "" : configuredBaseUrl;

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function apiUrl(path = "") {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
