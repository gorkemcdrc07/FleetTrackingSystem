export function parseRouteDate(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d;}
export function parseMaskedDate(value){
 const match=String(value||'').match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);if(!match)return '';
 const[,dd,mm,yyyy,hh,min]=match;const[day,month,year,hour,minute]=[dd,mm,yyyy,hh,min].map(Number);const check=new Date(Date.UTC(year,month-1,day));
 if(year<1900||check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day||hour>23||minute>59)return '';
 return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+03:00`).toISOString();
}
export function routeDateIssues(route){
 const issues=[];let previous=null;
 route.forEach((s,i)=>{const a=parseRouteDate(s.varis),d=parseRouteDate(s.cikis);
 for(const field of ['varis','cikis'])if(s[`${field}Input`]&&!parseMaskedDate(s[`${field}Input`]))issues.push(`${i+1}. durakta geçersiz veya eksik tarih var.`);
 if(a&&d&&d<a)issues.push(`${i+1}. durakta çıkış, varıştan önce olamaz.`);
 if(previous&&a&&a<previous)issues.push(`${i+1}. durakta varış, önceki duraktan çıkıştan önce olamaz.`);
 if(previous&&d&&d<previous)issues.push(`${i+1}. durakta çıkış, önceki duraktan çıkıştan önce olamaz.`);
 previous=d||a||previous;
 });return [...new Set(issues)];
}
export function durationLabel(value){if(!Number.isFinite(value)||value<0)return '—';const total=Math.round(value),h=Math.floor(total/60),m=total%60;return h?`${h} sa${m?` ${m} dk`:''}`:`${m} dk`;}
export function applyDrivingPlan(driveMin,state){
 if(!Number.isFinite(driveMin)||driveMin<0)throw new Error('Geçersiz sürüş süresi.');
 let remaining=driveMin,totalMin=0,breakMin=0,restMin=0;
 while(remaining>0){if(state.driveInBlock>=270){if(state.blocksInDay===0){totalMin+=45;breakMin+=45;state.blocksInDay=1;}else{totalMin+=660;restMin+=660;state.blocksInDay=0;}state.driveInBlock=0;}
 const amount=Math.min(remaining,270-state.driveInBlock);totalMin+=amount;remaining-=amount;state.driveInBlock+=amount;}
 return {legalDurationMin:totalMin,breakMin,restMin,state};
}
