export const SETTLEMENT_DATASETS = Object.freeze({
    PEPSI_FUEL: "pepsi-fuel",
    PEPSI_TRIPS: "pepsi-trips",
    HAYAT_KIMYA_FUEL: "hayat-kimya-fuel",
    HAYAT_KIMYA_TRIPS: "hayat-kimya-trips",
});

const TABLE_BY_DATASET = Object.freeze({
    [SETTLEMENT_DATASETS.PEPSI_FUEL]: "frigo_yakit_tmp",
    [SETTLEMENT_DATASETS.PEPSI_TRIPS]: "frigo_sefer_tmp",
    [SETTLEMENT_DATASETS.HAYAT_KIMYA_FUEL]: "hayat_kimya_yakit_tmp",
    [SETTLEMENT_DATASETS.HAYAT_KIMYA_TRIPS]: "hayat_kimya_sefer_tmp",
});

export function getSettlementDatasetTable(dataset) {
    const table = TABLE_BY_DATASET[dataset];
    if (!table) throw new Error(`İzin verilmeyen mutabakat veri kümesi: ${dataset}`);
    return table;
}
