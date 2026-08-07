export function readSettlementSpreadsheet(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const xlsxModule = await import("xlsx");
                const XLSX = xlsxModule.default || xlsxModule;
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                resolve(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

export async function downloadSettlementSpreadsheet(rows, fileName, sheetName = "Rapor") {
    const xlsxModule = await import("xlsx");
    const XLSX = xlsxModule.default || xlsxModule;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
}
