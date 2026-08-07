import test from "node:test";
import assert from "node:assert/strict";
import { extractMobilizList } from "../src/domain/mobilizResponse.js";

test("Mobiliz araç listesini desteklenen cevap zarflarından çıkarır", () => {
    const rows = [{ plate: "34ABC" }];
    assert.equal(extractMobilizList(rows), rows);
    assert.equal(extractMobilizList({ data: rows }), rows);
    assert.equal(extractMobilizList({ result: rows }), rows);
    assert.equal(extractMobilizList({ items: rows }), rows);
});

test("geçersiz Mobiliz cevabını boş listeye dönüştürür", () => {
    assert.deepEqual(extractMobilizList(null), []);
    assert.deepEqual(extractMobilizList({ data: {} }), []);
});
