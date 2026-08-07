import test from "node:test";
import assert from "node:assert/strict";
import {
    getSettlementDatasetTable,
    SETTLEMENT_DATASETS,
} from "../src/domain/settlementDatasets.js";

test("mutabakat veri kümelerini yalnızca izin verilen tablolara yönlendirir", () => {
    assert.equal(getSettlementDatasetTable(SETTLEMENT_DATASETS.PEPSI_FUEL), "frigo_yakit_tmp");
    assert.equal(getSettlementDatasetTable(SETTLEMENT_DATASETS.HAYAT_KIMYA_TRIPS), "hayat_kimya_sefer_tmp");
    assert.throws(() => getSettlementDatasetTable("kullanici_islem_loglari"), /İzin verilmeyen/);
});
