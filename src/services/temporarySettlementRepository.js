import { supabase } from "../supabaseClient";
import { getSettlementDatasetTable } from "../domain/settlementDatasets";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export async function replaceTemporarySettlementRows(dataset, rows) {
    const table = getSettlementDatasetTable(dataset);
    const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq("id", EMPTY_UUID);

    if (deleteError) throw deleteError;
    if (!rows?.length) return 0;

    const { error: insertError } = await supabase.from(table).insert(rows);
    if (insertError) throw insertError;
    return rows.length;
}
