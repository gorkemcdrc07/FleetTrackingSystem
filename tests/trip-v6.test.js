import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleWarningText,hasWarning,IKAZ_ACIKLAMA} from '../src/domain/tripWarning.js';
import {planTripSync} from '../src/domain/tripSync.js';
import {parseMaskedDate,routeDateIssues,durationLabel,applyDrivingPlan} from '../src/domain/routeTiming.js';
import {requestJson,responseList} from '../src/services/requestJson.js';
import {calculateRoadRoute,validPoint} from '../src/services/routePlanning.js';

test('warning toggles in both directions without erasing operator notes',()=>{
 const text=toggleWarningText('Sürücüyü ara');assert.ok(hasWarning({aciklama:text}));assert.equal(toggleWarningText(text),'Sürücüyü ara');assert.equal(toggleWarningText(IKAZ_ACIKLAMA),null);
});
test('TMS distinguishes new/changed/unchanged and preserves operator data',()=>{
 const old={sefer_no:'SFR1',plaka:'34A',aciklama:'not',tonaj_durumu:'Tonajlı',rota_detaylari:[{varis:'2026-09-10T08:00:00Z'}],arac_statu:'Teslimde'};
 const next={...old,plaka:'34B',aciklama:null,tonaj_durumu:'',rota_detaylari:[],arac_statu:'Yolda'};
 const plan=planTripSync([next,{sefer_no:'SFR2'}, {sefer_no:'SFR3',plaka:'34C'}],[old,{sefer_no:'SFR3',plaka:'34C'}]);
 assert.equal(plan.inserted.length,1);assert.equal(plan.unchanged,1);assert.deepEqual(plan.updates,[{sefer_no:'SFR1',patch:{plaka:'34B'}}]);
});
test('strict dates reject overflow, incomplete dates and reversed chronology',()=>{
 assert.equal(parseMaskedDate('31.02.2026 08:00'),'');assert.equal(parseMaskedDate('10.09.2026 25:00'),'');
 assert.equal(parseMaskedDate('10.09.2026 08:00'),'2026-09-10T05:00:00.000Z');
 assert.equal(routeDateIssues([{varis:'2026-09-09T22:00:00+03:00',cikis:'2026-09-09T00:00:00+03:00'}]).length,1);
 assert.ok(routeDateIssues([{cikis:'2026-09-10T10:00:00Z'},{varis:'2026-09-10T09:00:00Z'}]).length);
});
test('duration rounding and breaks across route legs',()=>{
 assert.equal(durationLabel(119.9),'2 sa');assert.equal(durationLabel(NaN),'—');
 const state={driveInBlock:0,blocksInDay:0};assert.equal(applyDrivingPlan(270,state).legalDurationMin,270);
 const second=applyDrivingPlan(271,state);assert.equal(second.breakMin,45);assert.equal(second.restMin,660);assert.equal(second.legalDurationMin,976);
 assert.throws(()=>applyDrivingPlan(NaN,state));
});
test('invalid response envelopes cannot silently become an empty sync',()=>{
 assert.throws(()=>responseList({error:'failed'}));assert.deepEqual(responseList({Data:[]}),[]);
});
test('temporary HTTP failures retry, permission and malformed JSON do not',async()=>{
 const original=global.fetch;let calls=0;
 try{
 global.fetch=async()=>++calls===1?new Response('busy',{status:503}):new Response('{"ok":true}');
 assert.deepEqual(await requestJson('mock'),{ok:true});assert.equal(calls,2);
 calls=0;global.fetch=async()=>{calls++;return new Response('no',{status:403});};await assert.rejects(requestJson('mock'),/403/);assert.equal(calls,1);
 global.fetch=async()=>new Response('<html>');await assert.rejects(requestJson('mock'),/JSON/);
 }finally{global.fetch=original;}
});
test('road route uses longitude first, validates all legs and preserves stop order',async()=>{
 const original=global.fetch;let requested;
 try{global.fetch=async url=>{requested=url;return new Response(JSON.stringify({code:'Ok',routes:[{distance:1200,duration:600,legs:[{distance:1200,duration:600}],geometry:{coordinates:[[27,41],[28,42]]}}]}));};
 const r=await calculateRoadRoute([{lat:41,lng:27},{lat:42,lng:28}]);assert.ok(requested.includes('27,41;28,42'));assert.equal(r.durationMin,10);assert.deepEqual(r.geometry,[[41,27],[42,28]]);
 await assert.rejects(calculateRoadRoute([{lat:41,lng:27},{lat:42,lng:28},{lat:41,lng:29}]),/rota/);
 assert.equal(validPoint({lat:'',lng:20}),false);
 }finally{global.fetch=original;}
});
