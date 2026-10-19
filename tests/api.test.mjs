// Run with: npm test
import { onRequestPost } from './.build/report.mjs';
const rows=[], counters=new Map(); let verifyCalls=0, schemaBatches=0; const verifyUrls=[];
const db={
  prepare(sql){return {sql,args:[],bind(...args){return {sql,args}}}},
  async batch(stmts){ if(stmts.some(s=>s.sql.startsWith('CREATE TABLE'))) schemaBatches++; return stmts.map(s=>{
    if(s.sql.startsWith('CREATE')) return {results:[]};
    if(s.sql.includes('INSERT INTO limits')){const n=(counters.get(s.args[0])??0)+1;counters.set(s.args[0],n);return {results:[{n}]}}
    if(s.sql.includes('INSERT INTO results')){rows.push(s.args);return {results:[]}}
    return {results:[]}})},
};
globalThis.fetch=async(url,init)=>{ verifyUrls.push(String(url)); if(String(url).includes('siteverify')||String(url).includes('mock-verify')){verifyCalls++; const t=init.body.get('response'); return new Response(JSON.stringify({success:t.startsWith('XXXX')}))} throw new Error('unexpected fetch')};
const rep={v:1,profile:{ageBand:"21-24",region:"London",carAge:"8-12 yrs",ncd:"1-2",cover:"Comprehensive",site:"GoCompare"},baselineRuns:3,noisePct:2.1,results:[{change:"add_named_driver",pct:-12,repeats:2}]};
const call=async(body,env={DB:db,TURNSTILE_SECRET:'s'},headers={})=>{const req=new Request('http://x.test/api/report',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});const r=await onRequestPost({request:req,env});return [r.status,await r.json(),r.headers]};
const check=(name,got,want)=>console.log(got===want?'PASS':'FAIL',name,'->',got);
check('valid + good token',(await call({token:'XXXX.DUMMY.TOKEN.XXXX',report:rep}))[0],200);
check('no secret configured fails closed (503)',(await call({token:'XXXX.DUMMY.TOKEN.XXXX',report:rep},{DB:db}))[0],503);
check('bad token -> 403',(await call({token:'nope-nope-nope-nope',report:rep}))[0],403);
check('missing token -> 403',(await call({report:rep}))[0],403);
const before=verifyCalls; await call({token:'XXXX.DUMMY.TOKEN.XXXX',report:{...rep,v:9}}); check('invalid report does NOT spend a bot-check call',verifyCalls-before,0);
check('cross-origin -> 403',(await call({token:'XXXX.DUMMY.TOKEN.XXXX',report:rep},undefined,{origin:'https://evil.example'}))[0],403);
// flood: 1 accepted so far. Cap is 60/hour.
let ok=1,limited=0,retry=null; for(let i=0;i<80;i++){const [s,,h]=await call({token:'XXXX.DUMMY.TOKEN.XXXX',report:rep}); if(s===200)ok++; else if(s===429){limited++;retry=h.get('retry-after')}}
check('hourly cap: accepted exactly 60',ok,60); check('hourly cap: rest limited (429)',limited,21); check('429 has retry-after',retry,'3600');
check('rows stored = accepted',rows.length,60);

check('tables are created once on first use, not on every request',schemaBatches===1,true);
{ verifyUrls.length=0;
  const mk=(host)=>new Request('http://'+host+'/api/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'XXXX.DUMMY.TOKEN.XXXX',report:rep})});
  const env={DB:db,TURNSTILE_SECRET:'s',TURNSTILE_VERIFY_URL:'http://mock-verify.test/siteverify'};
  await onRequestPost({request:mk('x.test'),env});
  check('the test-verifier override is IGNORED for a non-local request (real Cloudflare URL used)',verifyUrls.length===1&&verifyUrls[0].startsWith('https://challenges.cloudflare.com/'),true);
  verifyUrls.length=0; await onRequestPost({request:mk('localhost'),env});
  check('the override is honoured only for localhost',verifyUrls.length===1&&verifyUrls[0].startsWith('http://mock-verify.test/'),true); }
