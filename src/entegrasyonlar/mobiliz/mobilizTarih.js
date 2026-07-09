export function mobilizTarihFormatla(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);

    const pad = (num) => String(num).padStart(2, "0");

    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}+0300`;
}

export function bugunBaslangic() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return mobilizTarihFormatla(date);
}

export function bugunBitis() {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return mobilizTarihFormatla(date);
}