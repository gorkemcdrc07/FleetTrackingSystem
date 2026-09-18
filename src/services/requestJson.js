export async function requestJson(url, options = {}, { timeoutMs = 30000, retries = 1, onRetry } = {}) {
    for (let attempt = 0; ; attempt++) {
        const controller = new AbortController();
        const upstream = options.signal;
        const abort = () => controller.abort(upstream?.reason);
        if (upstream?.aborted) abort();
        upstream?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const text = await response.text();
            if (!response.ok) {
                let detail = "";
                try {
                    const parsed = text ? JSON.parse(text) : null;
                    detail = parsed?.error || parsed?.message || parsed?.detail || "";
                } catch {
                    detail = String(text || "").trim();
                }
                if (detail.length > 220) detail = `${detail.slice(0, 217)}...`;
                const hint = response.status === 401 || response.status === 403
                    ? 'Erişim yetkisini kontrol edin.'
                    : 'Lütfen yeniden deneyin.';
                const error = new Error(`Servis yanıt vermedi (HTTP ${response.status}).${detail ? ` ${detail}` : ''} ${hint}`.trim());
                error.status = response.status;
                error.detail = detail;
                error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
                throw error;
            }
            try { return JSON.parse(text); }
            catch { const error = new Error('Servis geçerli JSON verisi döndürmedi.'); error.retryable = false; throw error; }
        } catch (error) {
            if (upstream?.aborted) throw new DOMException('İstek iptal edildi', 'AbortError');
            const retryable = error.retryable ?? (controller.signal.aborted || error instanceof TypeError);
            if (!retryable || attempt >= retries) {
                if (controller.signal.aborted) throw new Error('Servis yanıtı zaman aşımına uğradı. Lütfen yeniden deneyin.');
                throw error;
            }
            onRetry?.(attempt + 1);
        } finally {
            clearTimeout(timeout);
            upstream?.removeEventListener('abort', abort);
        }
        await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
    }
}

export function responseList(json) {
    if (Array.isArray(json)) return json;
    for (const key of ['Data', 'data', 'result', 'items']) {
        if (Array.isArray(json?.[key])) return json[key];
    }
    throw new Error('Servis yanıtında beklenen kayıt listesi bulunamadı. Mevcut veriler korunuyor.');
}
