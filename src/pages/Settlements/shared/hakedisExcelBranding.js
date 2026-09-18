const readUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("fts_user") || "null");
    return user?.ad || user?.kullanici || "FTS Kullanıcısı";
  } catch {
    return "FTS Kullanıcısı";
  }
};

export function applyHakedisWorkbookBranding(workbook, options = {}) {
  if (!workbook?.worksheets) return workbook;
  const title = options.title || "Hakediş Raporu";
  const now = new Date();
  workbook.creator = readUser();
  workbook.lastModifiedBy = readUser();
  workbook.company = "Odak Lojistik";
  workbook.subject = title;
  workbook.title = title;
  workbook.created = now;
  workbook.modified = now;

  workbook.worksheets.forEach((worksheet) => {
    if (!worksheet) return;
    const firstRow = worksheet.getRow(1);
    if (firstRow?.cellCount) {
      firstRow.font = { ...(firstRow.font || {}), bold: true, color: { argb: "FFFFFFFF" } };
      firstRow.alignment = { ...(firstRow.alignment || {}), vertical: "middle", horizontal: "center" };
      firstRow.height = Math.max(firstRow.height || 15, 24);
      firstRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B5CF0" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9DCF0" } },
          left: { style: "thin", color: { argb: "FFD9DCF0" } },
          bottom: { style: "thin", color: { argb: "FFD9DCF0" } },
          right: { style: "thin", color: { argb: "FFD9DCF0" } },
        };
      });
      worksheet.views = worksheet.views?.length ? worksheet.views : [{ state: "frozen", ySplit: 1 }];
    }
    worksheet.pageSetup = { ...(worksheet.pageSetup || {}), orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    worksheet.headerFooter = {
      ...(worksheet.headerFooter || {}),
      oddHeader: `&L&BOdak Lojistik&C${title}&R${now.toLocaleDateString("tr-TR")}`,
      oddFooter: `&L${readUser()}&CFTS Hakediş&R&D &T`,
    };
  });
  return workbook;
}
