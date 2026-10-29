import {readFile, writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
const countries=JSON.parse(await readFile('public/data/globe/regions.json','utf8'))
const french=JSON.parse(await readFile('public/data/globe/names.fr.json','utf8'))
const codes=JSON.parse(await readFile('src/globe/flag-codes.json','utf8'))
const world=JSON.parse(await readFile('public/data/globe/countries.json','utf8'))
const byId=new Map([...world,...countries].map(c=>[c.id,c]))
const rows=countries.map(c=>({id:c.id,name:c.name,nameFr:c.nameFr||french[c.id]||c.name,regions:c.regions,flag:c.flag,parent:c.parent||null,parentName:c.parent?byId.get(c.parent)?.name||c.parent:null,parentFlag:!!c.parent&&codes[c.parent]===c.flag,custom:c.id.includes('-')}))
const flags={}
for(const code of new Set(rows.map(c=>c.flag)))flags[code]=await readFile(`public/data/globe/flags/${code}.svg`,'utf8')
// Rasterize the actual game SVGs at 64 by 48 pixels for a small,
// self-contained review file. The game still uses the original SVG assets.
const browser=await chromium.launch()
try {
 const page=await browser.newPage()
 const images=await page.evaluate(async svgFlags=>{
  const result={}
  for(const [code,svg] of Object.entries(svgFlags)) {
   const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}))
   const image=new Image();image.src=url;await image.decode()
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=48
   canvas.getContext('2d').drawImage(image,0,0,64,48)
   result[code]=canvas.toDataURL('image/png');URL.revokeObjectURL(url)
  }
  return result
 },flags)
 Object.assign(flags,images)
} finally {await browser.close()}
const snapshot=createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,12)
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Atlas territory review</title>
<style>
:root{color-scheme:dark;--foreground:#edf3f0;--muted:#a6b8be;--card:#132128;--secondary:#20333c;--border:#344b55;--primary:#99edc5;--radius:12px;--font-sans:system-ui,sans-serif}
*{box-sizing:border-box}html,body{margin:0;font-family:var(--font-sans);color:var(--foreground)}main{max-width:1100px;margin:auto}h1{font-size:26px;margin:0 0 12px}h2{font-size:23px;margin:8px 0}p{line-height:1.55;margin:8px 0;color:var(--muted)}button,input,textarea,select{font:inherit;color:inherit}button,select,input[type=search]{background:var(--secondary);border:1px solid var(--border);border-radius:8px;padding:10px 12px}button{cursor:pointer}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--primary);outline-offset:2px}button[aria-pressed=true]{border-color:var(--primary);color:var(--primary)}.intro,.tools,.region,.export{background:var(--card);padding:16px;border-radius:var(--radius);margin-bottom:16px}.tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tools input{flex:1;min-width:170px}.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}.region-head{display:flex;gap:12px;align-items:baseline;justify-content:space-between;flex-wrap:wrap}.list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.territory{padding:12px;border:1px solid var(--border);border-radius:8px;min-width:0}.territory.excluded{opacity:.6}.territory label{display:flex;align-items:center;gap:10px;font-weight:600;line-height:1.35;cursor:pointer}.territory input[type=checkbox]{accent-color:var(--primary);width:18px;height:18px;flex:none}.flag{width:36px;height:27px;object-fit:contain;flex:none;background:#fff;border-radius:2px}.meta{font-size:12px;color:var(--muted);margin:8px 0 0 28px;line-height:1.45}.note{display:block;width:calc(100% - 28px);margin:9px 0 0 28px;padding:7px 0;border:0;border-bottom:1px solid var(--border);border-radius:0;background:transparent;font-size:13px}.note::placeholder{color:var(--muted)}.summary{color:var(--primary);font-size:14px}.export textarea{width:100%;min-height:160px;background:var(--secondary);border:1px solid var(--border);border-radius:8px;padding:10px}small{color:var(--muted)}[hidden]{display:none!important}.export-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.empty{padding:20px}#status{min-height:22px}@media(max-width:600px){.list{grid-template-columns:1fr}h1{font-size:23px}.tools input{width:100%}.region-head{display:block}}@media print{.tools,.tabs,.export,.note{display:none}.region{break-inside:auto;background:transparent}.territory{break-inside:avoid}.list{grid-template-columns:repeat(2,minmax(0,1fr))}:root{print-color-adjust:exact}
</style></head><body><main>
<div class="intro"><h1>Atlas territory review</h1><p>Review every country, island and territory in the proposed regional game modes. Each flag below shows the artwork currently used in the game, rendered from its SVG asset.</p><p>Bermuda is included in the Americas with its own flag. Regions overlap intentionally. Canaries and Madeira are in Europe and Africa; the Azores are in Europe; Greenland is in Europe and the Americas. Russia, Turkey, Armenia, Azerbaijan, Georgia and Cyprus are in Europe and Asia.</p><p>Untick an entry to propose removing it from that region. Use its note for a different flag, name or grouping. Missing territory? Add it in the final notes. Your choices are review notes and do not change the game automatically.</p><small>Snapshot ${snapshot} · ${rows.length} distinct places · ${rows.reduce((n,c)=>n+c.regions.length,0)} region memberships · Flags from flag-icons 7.5.0, MIT. The accompanying game assets retain the license.</small></div>
<div class="tools"><input id="search" type="search" placeholder="Search names, country or territory code…" aria-label="Search territories"><select id="language" aria-label="Territory name language"><option value="en">English names</option><option value="fr">Noms français</option></select><button id="changes" aria-pressed="false">Changes only</button></div>
<nav class="tabs" aria-label="Regions" id="tabs"></nav><p id="status" role="status" aria-live="polite"></p><div id="regions"></div>
<section class="export"><h2>Notes and missing territories</h2><p>Add places that are missing, flag choices or questions here. Export your review when ready.</p><textarea id="notes" aria-label="Notes and missing territories" placeholder="For example: add Saba separately to the Americas; use the regional flag for Corsica…"></textarea><div class="export-actions"><button id="export">Download review JSON</button><button id="copy">Copy changes</button><button id="reset">Reset review</button></div><p id="saved" role="status">Choices are saved in this browser when browser storage is available.</p><textarea id="output" hidden readonly aria-label="Review export text"></textarea></section>
</main><script>
(async () => {
const DATA=${JSON.stringify(rows).replaceAll('<','\\u003c')};
const FLAGS=${JSON.stringify(flags)};
const SNAPSHOT=${JSON.stringify(snapshot)};
const REGIONS={americas:'Americas',europe:'Europe',africa:'Africa',asia:'Asia',oceania:'Oceania / Pacific'};
const KEY='atlas-territory-review-'+SNAPSHOT;
let state={choices:{},notes:'',language:'en'},active='americas',changesOnly=false;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&saved.choices&&typeof saved.choices==='object')state={...state,...saved}}catch{}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const choice=(region,id)=>state.choices[region+':'+id]||{included:true,note:''};
const name=c=>state.language==='fr'?c.nameFr:c.name;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#saved').textContent='Review saved in this browser.'}catch{$('#saved').textContent='Browser storage is unavailable. Download your review to keep it.'}}
function totals(region){return DATA.filter(c=>c.regions.includes(region)).length}
function render(){
 $('#tabs').innerHTML=Object.entries({all:'All regions',...REGIONS}).map(([id,label])=>'<button data-region="'+id+'" aria-pressed="'+(id===active)+'">'+esc(label)+(id==='all'?'':' · '+totals(id))+'</button>').join('');
 const query=$('#search').value.toLocaleLowerCase().trim();let shown=0;
 $('#regions').innerHTML=Object.entries(REGIONS).filter(([r])=>active==='all'||active===r).map(([r,label])=>{
  const entries=DATA.filter(c=>c.regions.includes(r));const selected=entries.filter(c=>choice(r,c.id).included).length;
  const visible=entries.filter(c=>(!query||[c.name,c.nameFr,c.id,c.parentName||''].join(' ').toLocaleLowerCase().includes(query))&&(!changesOnly||!choice(r,c.id).included||choice(r,c.id).note)).sort((a,b)=>name(a).localeCompare(name(b),state.language));shown+=visible.length;
  return '<section class="region"><div class="region-head"><h2>'+esc(label)+'</h2><span class="summary">'+selected+' / '+entries.length+' included</span></div><div class="list">'+visible.map(c=>{
   const value=choice(r,c.id),other=c.regions.filter(x=>x!==r).map(x=>REGIONS[x]);
   let meta=c.id+' · '+c.flag.toUpperCase()+' flag';if(c.parentName)meta+=' · '+(c.parentFlag?'Uses '+c.parentName+"’s flag":'Associated country: '+c.parentName);if(other.length)meta+=' · Also in '+other.join(', ');
   return '<article class="territory '+(value.included?'':'excluded')+'" data-row="'+r+':'+c.id+'"><label><input type="checkbox" data-id="'+c.id+'" data-scope="'+r+'" '+(value.included?'checked':'')+'><img class="flag" src="'+FLAGS[c.flag]+'" alt="'+esc(c.flag.toUpperCase()+' flag')+'"><span>'+esc(name(c))+'</span></label><div class="meta">'+esc(meta)+'</div><input class="note" data-id="'+c.id+'" data-scope="'+r+'" aria-label="'+esc('Review note for '+c.name+' in '+label)+'" placeholder="Note, flag or name to change…" value="'+esc(value.note)+'"></article>'
  }).join('')+'</div>'+(!visible.length?'<p class="empty">No matching territories.</p>':'')+'</section>'
 }).join('');
 const edits=Object.values(state.choices).filter(c=>!c.included||c.note).length;
 $('#status').textContent=shown+' entries shown · '+edits+' reviewed changes';
}
function exportData(){return {snapshot:SNAPSHOT,createdAt:new Date().toISOString(),regions:Object.fromEntries(Object.keys(REGIONS).map(r=>[r,DATA.filter(c=>c.regions.includes(r)).map(c=>({id:c.id,name:c.name,flag:c.flag,...choice(r,c.id)}))])),notes:state.notes}}
function changesText(){const lines=['Atlas territory review · '+SNAPSHOT];for(const [r,label] of Object.entries(REGIONS))for(const c of DATA.filter(c=>c.regions.includes(r))){const v=choice(r,c.id);if(!v.included||v.note)lines.push(label+' / '+c.name+' ['+c.id+']: '+(v.included?'KEEP':'REMOVE')+(v.note?' · '+v.note:''))}if(state.notes)lines.push('Notes: '+state.notes);return lines.join('\\n')}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-region]');if(b){active=b.dataset.region;render()}});
$('#search').addEventListener('input',render);
$('#language').value=state.language;$('#language').addEventListener('change',e=>{state.language=e.target.value;save();render()});
$('#changes').addEventListener('click',e=>{changesOnly=!changesOnly;e.target.setAttribute('aria-pressed',changesOnly);render()});
$('#regions').addEventListener('change',e=>{if(e.target.type==='checkbox'){const {id,scope}=e.target.dataset;state.choices[scope+':'+id]={...choice(scope,id),included:e.target.checked};save();render()}});
$('#regions').addEventListener('input',e=>{if(e.target.classList.contains('note')){const {id,scope}=e.target.dataset;state.choices[scope+':'+id]={...choice(scope,id),note:e.target.value};save()}});
$('#notes').value=state.notes;$('#notes').addEventListener('input',e=>{state.notes=e.target.value;save()});
$('#export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(exportData(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='atlas-territory-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
$('#copy').addEventListener('click',async()=>{const text=changesText();try{await navigator.clipboard.writeText(text);$('#saved').textContent='Changes copied.'}catch{$('#output').hidden=false;$('#output').value=text;$('#output').focus();$('#output').select();$('#saved').textContent='Copy the selected text below.'}});
$('#reset').addEventListener('click',()=>{if(confirm('Reset all choices and notes?')){state.choices={};state.notes='';$('#notes').value='';save();render()}});
render();
})().catch(error=>{document.querySelector('#status').textContent='Unable to open the review: '+error.message});
</script></body></html>`
await writeFile('docs/regional-territory-review.html',html)
console.log(JSON.stringify({path:'docs/regional-territory-review.html',bytes:Buffer.byteLength(html),places:rows.length,memberships:rows.reduce((n,c)=>n+c.regions.length,0),snapshot,bermuda:rows.find(c=>c.id==='BMU')}))
