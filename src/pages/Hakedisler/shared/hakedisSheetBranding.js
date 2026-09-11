const getUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("fts_user") || "null");
    return user?.ad || user?.kullanici || "FTS Kullanıcısı";
  } catch { return "FTS Kullanıcısı"; }
};

export function applyHakedisSheetBranding(XLSX, workbook, worksheet, title = "Hakediş Raporu") {
  if (!workbook || !worksheet) return;
  workbook.Props = {
    ...(workbook.Props || {}),
    Title: title,
    Subject: title,
    Author: getUser(),
    Company: "Odak Lojistik",
    CreatedDate: new Date(),
  };
  const range = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : null;
  if (!range) return;
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const ref = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = worksheet[ref];
    if (!cell) continue;
    cell.s = {
      ...(cell.s || {}),
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "5B5CF0" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "D9DCF0" } },
        bottom: { style: "thin", color: { rgb: "D9DCF0" } },
        left: { style: "thin", color: { rgb: "D9DCF0" } },
        right: { style: "thin", color: { rgb: "D9DCF0" } },
      },
    };
  }
  worksheet["!autofilter"] = worksheet["!autofilter"] || { ref: XLSX.utils.encode_range({ r: range.s.r, c: range.s.c }, { r: range.s.r, c: range.e.c }) };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}
