export const IKAZ_ACIKLAMA = 'Operasyon verimsizlik konusunda ikaz edildi ama yine de araç bulamadıkları için filo ataması yapıldı.';
export function hasWarning(row) { return String(row?.aciklama || '').includes(IKAZ_ACIKLAMA); }
export function toggleWarningText(value) {
    const text = String(value || '');
    if (text.includes(IKAZ_ACIKLAMA)) return text.replace(IKAZ_ACIKLAMA, '').trim() || null;
    return [text.trim(), IKAZ_ACIKLAMA].filter(Boolean).join('\n');
}
