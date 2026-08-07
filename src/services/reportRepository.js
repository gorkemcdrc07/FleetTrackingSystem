import { supabase } from "../supabaseClient";
import { attachReportSource, REPORT_TRIP_SOURCES } from "../domain/reportTrips";

const PAGE_SIZE = 1000;
const REPORT_COLUMNS = `
    id,
    sefer_no,
    sefer_tarihi,
    plaka,
    treyler,
    surucu_ad_soyad,
    musteri_adi,
    proje_adi,
    arac_statu,
    rota_detaylari
`;

async function listSourceTrips(source, startDate, endDate) {
    let from = 0;
    const rows = [];

    while (true) {
        const { data, error } = await supabase
            .from(source.table)
            .select(REPORT_COLUMNS)
            .not("rota_detaylari", "is", null)
            .gte("sefer_tarihi", startDate)
            .lte("sefer_tarihi", endDate)
            .order("sefer_tarihi", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data?.length) break;

        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return attachReportSource(rows, source);
}

export async function listReportTrips({ startDate, endDate }) {
    const sourceRows = await Promise.all(
        REPORT_TRIP_SOURCES.map((source) =>
            listSourceTrips(source, startDate, endDate)
        )
    );

    return sourceRows.flat();
}
