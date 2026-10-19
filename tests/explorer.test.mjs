// Run with: npm test
const store={}; globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
const m=await import('./.build/explorer.mjs');
const ok=(n,c)=>console.log(c?'PASS':'FAIL',n);
// baseline + noise
let b=m.baseline([1000,1040,980]); ok('noise from 3 baseline runs = max(5, spread)',Math.abs(b.spreadPct-6)<0.1 && Math.abs(b.noise-b.spreadPct)<1e-9 && b.runs===3);
ok('single baseline uses the 5% floor',m.baseline([1000]).noise===5 && m.baseline([null]).avg===null);
// results
const s=m.sampleStore(); const r=m.allResults(s); const by=Object.fromEntries(r.map(x=>[x.id,x]));
ok('sample: one driver -15% and two drivers -22%',Math.abs(by.drivers.pct+15.3)<0.3&&Math.abs(by.drivers2.pct+22.1)<0.3&&by.drivers2.change==='add_two_named_drivers'&&by.drivers.change==='add_named_driver');
ok('sample: value test is within noise',by.value.verdict==='noise'); ok('sample: change keys mapped',by.drivers2.change==='add_two_named_drivers'&&by.blackbox.change==='black_box'&&by.cover.change==='cover_tpft'&&by.value.change==='vehicle_value_down');
// repeats
const st=m.emptyStore(); st.baselineRuns=[1000,1010]; st.tests.drivers={params:{...m.TESTS.drivers.defaults},runs:[850,950]};
const rr=m.allResults(st)[0]; ok('repeat runs averaged (900) and flagged as disagreeing',rr.avg===900&&rr.repeatsDisagree===true&&rr.runs===2);
// skipped tests excluded; custom included
st.tests.drivers.skipped=true; st.custom.push({id:'c',label:'My test',price:900}); const r2=m.allResults(st); ok('skipped excluded, custom included',r2.length===1&&r2[0].id==='c'&&r2[0].change===null);
// instructions
const T=m.TESTS; ok('value instruction uses ref number',T.value.instruction({dir:'down'},{vehicleValue:4000,mileage:null}).includes('£3,600'));
ok('mileage instruction uses ref number',T.mileage.instruction({dir:'up'},{vehicleValue:null,mileage:8000}).includes('11,200'));
ok('no gender option anywhere in the catalog',!/"(male|female)"/i.test(JSON.stringify(Object.values(T).map(t=>t.params))));
ok('drivers: nothing is pre-selected and the text asks you to choose',Object.values(T.drivers.defaults).every(v=>v==='')&&Object.values(T.drivers2.defaults).every(v=>v==='')&&/Choose their details below/.test(T.drivers.instruction(T.drivers.defaults,{vehicleValue:null,mileage:null}))&&/choose their details below/.test(T.drivers2.instruction(T.drivers2.defaults,{vehicleValue:null,mileage:null})));
ok('drivers wording uses only the details chosen',/one named driver: partner, aged 40-49, licence held 5 or more years, no claims or convictions/.test(T.drivers.instruction({who:'partner',age:'40-49',licence:'5+',record:'none'},{vehicleValue:null,mileage:null}))&&/second named driver: parent, aged 50-59/.test(T.drivers2.instruction({who:'parent',age:'50-59',licence:'5+',record:'none'},{vehicleValue:null,mileage:null}))&&/one named driver: friend\. Keep/.test(T.drivers.instruction({who:'friend',age:'',licence:'',record:''},{vehicleValue:null,mileage:null})));
// ordering
const none=m.orderTests(null); ok('generic order when no answers',!none.personal&&none.items[0].test.id==='drivers'&&none.items.length===12);
const A={age:'17-20',ncd:'0',cover:'Comprehensive',job:'professional',household:'two',mileage:'mid',excess:'none',claim:'maybe',payment:'monthly',blackbox:'yes',renewal:'lt2'};
const o=m.orderTests(A); ok('personal order follows the Fog Off score; second driver follows the first; job comes after the High free tips',(()=>{ const ids=o.items.map(i=>i.test.id); return o.personal && ids.slice(0,3).join()==='blackbox,drivers,drivers2' && ids.indexOf('job')>ids.indexOf('pay') && ids.indexOf('job')>ids.indexOf('timing'); })());
ok('plan cards carry the score and band from the guided check',(()=>{ const bb=o.items.find(i=>i.test.id==='blackbox'); const d2=o.items.find(i=>i.test.id==='drivers2'); return Math.round(bb.score)===48&&bb.band==='High'&&d2.band===o.items.find(i=>i.test.id==='drivers').band; })());
ok('every test appears once',new Set(o.items.map(i=>i.test.id)).size===12);
const B={...A,age:'40-49',household:'none',blackbox:'no',ncd:'10+'}; const ob=m.orderTests(B); ok('no household -> both driver tests fall to "more"',ob.items.find(i=>i.test.id==='drivers').group==='more'&&ob.items.find(i=>i.test.id==='drivers2').group==='more');
const A1={...A,household:'one'}; const o1=m.orderTests(A1); ok('one other driver -> second-driver test is only an extra',o1.items.find(i=>i.test.id==='drivers').group!=='more'&&o1.items.find(i=>i.test.id==='drivers2').group==='more');
// migration from v1
for(const k of Object.keys(store)) delete store[k];
store['qg-whatif-v1']=JSON.stringify({baseline:1500,usingSample:false,scenarios:[{label:'Add a named driver (who genuinely drives)',price:1275},{label:'My own custom test',price:1400},{label:'',price:null},{label:'Voluntary excess +£500',price:1450}]});
const mg=m.load(); ok('v1 migrates: baseline kept, driver+excess mapped, custom kept, blank dropped',mg.baselineRuns[0]===1500&&mg.tests.drivers.runs[0]===1275&&mg.tests.excess.params.amount==='500'&&mg.custom.length===1&&mg.custom[0].label==='My own custom test');
store['qg-whatif-v1']=JSON.stringify({baseline:3339,usingSample:true,scenarios:[{label:'Add mum as a driver',price:2827}]}); for(const k of ['qg-whatif-v2']) delete store[k]; const sm=m.load(); ok('v1 sample data is dropped',sm.baselineRuns[0]===null&&sm.custom.length===0);

// leftovers of the old sample rows are dropped (the bug in the screenshot)
for(const k of Object.keys(store)) delete store[k];
store['qg-whatif-v1']=JSON.stringify({baseline:450,usingSample:false,scenarios:[{label:'Add mum as a driver',price:2827},{label:'Add dad as a driver',price:2843},{label:'Add both parents',price:2601},{label:'Vehicle value +\u00a3200',price:3339},{label:'Vehicle value \u2212\u00a3200',price:3339},{label:'Add a tracker',price:3337},{label:'Change course type',price:3339},{label:'Add a second job',price:3339},{label:'Black box (telematics) quote',price:380}]});
let lo=m.load(); ok('old sample leftovers dropped from v1, real row kept',lo.custom.length===0&&lo.baselineRuns[0]===450&&lo.tests.blackbox.runs[0]===380);
// a v2 blob that already holds the junk is cleaned on load too
for(const k of Object.keys(store)) delete store[k];
const junk=m.emptyStore(); junk.baselineRuns=[500]; junk.custom=[{id:'a',label:'Add mum as a driver',price:2827},{id:'b',label:'Add a tracker',price:3337},{id:'c',label:'My real test',price:480}]; store['qg-whatif-v2']=JSON.stringify(junk);
lo=m.load(); ok('v2 junk rows removed on load, real custom test kept',lo.custom.length===1&&lo.custom[0].label==='My real test');
// old "count: two" setting moves to the second-driver test
for(const k of Object.keys(store)) delete store[k];
const old=m.emptyStore(); old.baselineRuns=[1000]; old.tests.drivers={params:{count:'two',who:'parent',age:'50-59',licence:'5+',record:'none'},runs:[780]}; store['qg-whatif-v2']=JSON.stringify(old);
lo=m.load(); ok('count=two migrates to the second-driver test; no count param remains',lo.tests.drivers2.runs[0]===780&&lo.tests.drivers.runs[0]===null&&!('count' in lo.tests.drivers.params)&&lo.tests.drivers2.params.who==='parent');
// implausible result is visible in the maths (guard shows when |pct|>100)
const bad=m.emptyStore(); bad.baselineRuns=[450]; bad.custom=[{id:'z',label:'x',price:3000}]; ok('implausible effect is detectable',Math.abs(m.allResults(bad)[0].pct)>100);

// ---- start dates, custom entries
const day=(n)=>{const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return m.isoDate(d)};
const tm=m.TESTS.timing; const R={vehicleValue:null,mileage:null};
ok('timing preset 4 weeks maps to start_later_4w and names a real date',tm.change({when:'4w'})==='start_later_4w' && /26 days from today/.test(tm.instruction({when:'4w'},R)) && /usual best window/.test(tm.instruction({when:'4w'},R)));
ok('timing presets map to their own keys',['1d','1w','2w','3w','6w','8w'].map(w=>tm.change({when:w})).join()==='start_later_1d,start_later_1w,start_later_2w,start_later_3w,start_later_6w,start_later_8w');
ok('calendar date 14 days out maps to the 2-week bucket',tm.change({when:'custom',date:day(14)})==='start_later_2w' && /14 days from today/.test(tm.instruction({when:'custom',date:day(14)},R)));
ok('calendar date 24 days out is in the best window and maps to 4 weeks',tm.change({when:'custom',date:day(24)})==='start_later_4w' && /usual best window/.test(tm.instruction({when:'custom',date:day(24)},R)));
ok('odd calendar date (35 days) is allowed but not shareable',tm.change({when:'custom',date:day(35)})===null && /35 days from today/.test(tm.instruction({when:'custom',date:day(35)},R)));
ok('tomorrow wording',/tomorrow/.test(tm.instruction({when:'custom',date:day(1)},R)));
ok('past or empty date is refused politely',/Pick a start date/.test(tm.instruction({when:'custom',date:day(-3)},R)) && /Pick a start date/.test(tm.instruction({when:'custom'},R)));
ok('daysUntil handles bad input',m.daysUntil('nope')===null && m.daysUntil(day(5))===5);
const ex=m.TESTS.excess;
ok('excess custom 500 is shareable as 500; 750 is not',ex.change({amount:'custom',amountCustom:'500'})==='excess_500' && ex.change({amount:'custom',amountCustom:'750'})===null && /£750/.test(ex.instruction({amount:'custom',amountCustom:'750'},R)));
ok('excess presets unchanged',ex.change({amount:'250'})==='excess_250'&&ex.change({amount:'1000'})==='excess_1000');
const mi=m.TESTS.mileage, va=m.TESTS.value;
ok('mileage custom -25% uses the exact number and is not shareable',/from 8,000 to 6,000 miles \(−25%\)/.test(mi.instruction({dir:'custom',pctCustom:'-25'},{vehicleValue:null,mileage:8000})) && mi.change({dir:'custom',pctCustom:'-25'})===null);
ok('mileage custom +40 equals the preset key',mi.change({dir:'custom',pctCustom:'40'})==='mileage_up');
ok('value custom -10 equals the preset key; +15 is not shareable',va.change({dir:'custom',pctCustom:'-10'})==='vehicle_value_down'&&va.change({dir:'custom',pctCustom:'15'})===null&&/\+15%/.test(va.instruction({dir:'custom',pctCustom:'15'},{vehicleValue:4000,mileage:null})));
ok('empty custom percent asks for a number',/Type the % change/.test(va.instruction({dir:'custom',pctCustom:''},R)));

// ---- excess reference, combinations, leftover-change detector
ok('excess instruction says raise from X to Y when the current excess is known',/Raise your voluntary excess from £250 to £750 \(\+£500\)/.test(ex.instruction({amount:'500'},{vehicleValue:null,mileage:null,excess:250})) && /Add £500 to your voluntary excess/.test(ex.instruction({amount:'500'},R)));
{ const s2=m.emptyStore(); s2.baselineRuns=[1000];
  s2.tests.blackbox={params:{},runs:[700]}; s2.tests.drivers={params:{...m.TESTS.drivers.defaults},runs:[850]}; s2.tests.drivers2={params:{...m.TESTS.drivers2.defaults},runs:[820]}; s2.tests.excess={params:{amount:'500'},runs:[930]}; s2.tests.value={params:{dir:'down'},runs:[1002]};
  const res=m.allResults(s2); const c=m.stackCandidates(res);
  ok('candidates: only real cheaper changes, best first, one driver test (the cheaper) kept',c.map(x=>x.id).join()==='blackbox,drivers2,excess');
  const noise=m.baseline(s2.baselineRuns).noise;
  let st=m.buildStack(c,{},noise); ok('step 1 is the best single change; step 2 waits for a price',st.first.id==='blackbox'&&st.steps.length===1&&st.steps[0].kept===null&&!st.done&&st.bestPrice===700);
  st=m.buildStack(c,{drivers2:600},noise); ok('adding drivers2 on top that helps is KEPT (700 to 600) and unlocks the next step',st.steps[0].kept===true&&st.steps[0].gainPct>14&&st.bestPrice===600&&st.steps.length===2&&st.steps[1].trial.join()==='blackbox,drivers2,excess');
  st=m.buildStack(c,{drivers2:690,excess:700},noise); ok('a change that does not help on top is DROPPED and does not change the best price',st.steps[0].kept===false&&st.bestPrice===700&&st.steps[1].kept===false&&st.steps[1].trial.join()==='blackbox,excess'&&st.done===true);
  st=m.buildStack(c,{drivers2:600,excess:580},noise); ok('a small gain under the noise level is dropped; a big one kept',st.steps[1].kept===false&&st.bestPrice===600);
  st=m.buildStack(c,{drivers2:600,excess:540},noise); ok('combination ends at the lowest kept price',st.steps[1].kept===true&&st.bestPrice===540&&st.keptIds.join()==='blackbox,drivers2,excess'&&st.done);
  ok('no candidates -> empty',m.buildStack([],{},5).first===null);
}
{ const s3=m.emptyStore(); s3.baselineRuns=[1000]; s3.tests.drivers={params:{...m.TESTS.drivers.defaults},runs:[850]}; s3.tests.blackbox={params:{},runs:[850]}; s3.tests.value={params:{dir:'down'},runs:[1003]}; s3.tests.excess={params:{amount:'500'},runs:[1003]};
  const sus=m.findSuspects(m.allResults(s3),['drivers','blackbox','excess','value']);
  ok('identical later price that differs from baseline is flagged against the earlier test',sus.blackbox==='Add one more driver'&&!sus.drivers);
  ok('identical prices that are just "no effect" (within noise) are NOT flagged',!sus.value&&!sus.excess);
}
ok('refs migrate: old stores without excess still load',(()=>{ for(const k of Object.keys(store)) delete store[k]; store['qg-whatif-v2']=JSON.stringify({v:2,baselineRuns:[900],refs:{vehicleValue:4000,mileage:null},tests:{},custom:[],usingSample:false}); const L=m.load(); return L.refs.vehicleValue===4000&&L.refs.excess===null&&typeof L.stack==='object' })());

// ---- recipe and saving from the saved plan (used by the Share step)
{ const s4=m.emptyStore(); s4.baselineRuns=[1000]; s4.refs.excess=250;
  s4.tests.blackbox={params:{},runs:[700]}; s4.tests.drivers2={params:{...m.TESTS.drivers2.defaults},runs:[820]}; s4.tests.excess={params:{amount:'500'},runs:[930]};
  // before the combination is finished: best single change only
  let pi=m.planToQuotes(s4,{claim:'unlikely'});
  ok('baseline row carries over with the voluntary excess',pi.quotes[0].source==='baseline'&&pi.quotes[0].price===1000&&pi.quotes[0].excess===250);
  ok('before the combination is done the recipe is the best single change',pi.recipeIds.join()==='blackbox'&&pi.quotes[1].price===700&&Math.abs(pi.savingPct+30)<0.01);
  ok('claim chance comes from the guided check (unlikely = 5)',pi.claimPct===5&&m.planToQuotes(s4,{claim:'likely'}).claimPct===30&&m.planToQuotes(s4,null).claimPct===null);
  // finish the combination: drivers2 on top helps, excess on top does not
  s4.stack={drivers2:600,excess:610};
  pi=m.planToQuotes(s4,{});
  ok('finished combination becomes the recipe at its final price',pi.recipeIds.join()==='blackbox,drivers2'&&pi.recipePrice===600&&Math.abs(pi.savingPct+40)<0.01&&pi.quotes[1].label.includes('Black box or app quote + Add a second driver as well'));
  s4.stack={drivers2:600,excess:540};
  pi=m.planToQuotes(s4,{});
  ok('a kept excess change raises the carried-over excess (250 + 500 = 750)',pi.recipeIds.includes('excess')&&pi.quotes[1].excess===750);
  const e=m.emptyStore(); ok('no plan -> no rows, nothing invented',m.planToQuotes(e,{}).quotes.length===0&&m.planToQuotes(e,{}).savingPct===null);
  const e2=m.emptyStore(); e2.baselineRuns=[800]; ok('baseline only -> one row',m.planToQuotes(e2,{}).quotes.length===1&&m.planToQuotes(e2,{}).recipeIds.length===0);
}

// ---- hardening: normalise junk, share limits match the server, purge SQL
{ const bad=m.normalize({baselineRuns:'x',refs:{vehicleValue:'4000',mileage:NaN},tests:{drivers:{params:{who:'partner',evil:{a:1},age:123},runs:[1,2,3,4,5,'9',null]},bogus:{params:{},runs:[1]},excess:'nope',blackbox:{runs:[700]}},custom:[null,{label:'x'.repeat(500),price:'12'},{id:'a',label:'ok',price:900}],stack:{drivers2:600,bogus:1,excess:'x'},usingSample:'yes'});
  ok('normalize: junk becomes a safe store',Array.isArray(bad.baselineRuns)&&bad.baselineRuns.length===1&&bad.baselineRuns[0]===null&&bad.refs.vehicleValue===null&&bad.refs.mileage===null);
  ok('normalize: unknown tests dropped; params only strings; runs max 3, numbers or null',!('bogus' in bad.tests)&&!('excess' in bad.tests)&&bad.tests.drivers.params.who==='partner'&&!('evil' in bad.tests.drivers.params)&&bad.tests.drivers.params.age==='40-49'===false&&bad.tests.drivers.runs.length===3&&bad.tests.drivers.runs.every(r=>r===null||typeof r==='number')&&bad.tests.blackbox.params!==undefined);
  ok('normalize: custom limited and cleaned; stack keeps only real tests with numbers; flags are booleans',bad.custom.length===2&&bad.custom[0].label.length===120&&bad.custom[0].price===null&&bad.custom[1].price===900&&bad.stack.drivers2===600&&!('bogus' in bad.stack)&&bad.stack.excess==null&&bad.usingSample===false);
  ok('normalize: null and a string do not throw',m.normalize(null).baselineRuns[0]===null&&m.normalize('x').custom.length===0);
  const good=m.sampleStore(); const again=m.normalize(JSON.parse(JSON.stringify(good))); ok('normalize keeps a good store unchanged (sample round trip)',JSON.stringify(again.tests)===JSON.stringify(good.tests)&&again.baselineRuns[0]===3339);
}
{ const R=(pct,noise=2)=>({v:1,profile:{ageBand:'21-24',region:'London',carAge:'8-12 yrs',ncd:'1-2',cover:'Comprehensive',site:'GoCompare'},baselineRuns:2,noisePct:noise,results:[{change:'add_named_driver',pct,repeats:1}]});
  ok('share limits: client range check matches the server for -90, -91, 300, 301',[-90,300].every(p=>m.inShareRange(p)&&m.validateReport(R(p)).ok)&&[-91,301].every(p=>!m.inShareRange(p)&&!m.validateReport(R(p)).ok));
  ok('share limits: noise 50 accepted, 50.1 rejected, NOISE_MAX=50',m.NOISE_MAX===50&&m.validateReport(R(-10,50)).ok&&!m.validateReport(R(-10,50.1)).ok); }
{ const {DatabaseSync}=await import('node:sqlite'); const db=new DatabaseSync(':memory:'); db.exec("CREATE TABLE results (id INTEGER PRIMARY KEY, week TEXT); CREATE TABLE limits (bucket TEXT PRIMARY KEY, n INTEGER)");
  const d=(n)=>{const x=new Date(Date.now()-n*864e5); return x.toISOString().slice(0,10)};
  for(const [i,days] of [[1,10],[2,400],[3,729],[4,731],[5,900]]) db.prepare("INSERT INTO results VALUES (?,?)").run(i,d(days));
  for(const [b,days] of [['h:'+d(0)+'T05',0],['d:'+d(2),2],['d:'+d(4),4],['h:'+d(30)+'T09',30]]) db.prepare("INSERT INTO limits VALUES (?,1)").run(b);
  db.exec("DELETE FROM results WHERE week < date('now', '-730 days')"); db.exec("DELETE FROM limits WHERE substr(bucket, 3, 10) < date('now', '-3 days')");
  const kept=db.prepare("SELECT id FROM results ORDER BY id").all().map(r=>r.id).join(); const lk=db.prepare("SELECT bucket FROM limits").all().length;
  ok('purge SQL: keeps reports up to 730 days old, deletes older ones (kept ids '+kept+')',kept==='1,2,3');
  ok('purge SQL: keeps counters from the last 3 days only (kept '+lk+')',lk===2); }

// the plan still loads if removing the old comparer keys fails (e.g. storage quirks)
{ const keep=globalThis.localStorage; for(const k of Object.keys(store)) delete store[k];
  store['qg-whatif-v2']=JSON.stringify({v:2,baselineRuns:[777],refs:{},tests:{},custom:[],usingSample:false});
  globalThis.localStorage={getItem:k=>store[k]??null,setItem:()=>{},removeItem:()=>{throw new Error('blocked')}};
  ok('plan loads even when removing old keys throws',m.load().baselineRuns[0]===777);
  store['qg-compare-v2']='x'; globalThis.localStorage={...keep}; m.load(); ok('old comparer keys are removed on load',!('qg-compare-v2' in store)); }
