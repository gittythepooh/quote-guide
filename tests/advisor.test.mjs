// Run with: npm test
import { advise, STEPS } from './.build/advisor.mjs';
const show=(name,a,c)=>advise(a,c);
const ok=(n,c)=>console.log(c?'PASS':'FAIL',n);
const A=show('19yo, no NCD, 2 other drivers, open to black box, monthly, <2wks',{age:'17-20',ncd:'0',cover:'Comprehensive',job:'professional',household:'two',mileage:'mid',excess:'none',claim:'maybe',payment:'monthly',blackbox:'yes',renewal:'lt2'});
ok('A: black box then drivers lead (largest measured effects)',A[0].id==='blackbox'&&A[1].id==='drivers'); ok('A: black box in top group',A.find(i=>i.id==='blackbox').group==='start'); ok('A: monthly item present',!!A.find(i=>i.id==='pay'));
ok('A: groups follow the band exactly',A.every(i=>i.group===(i.band==='High'?'start':i.band==='Medium'?'also':'skip')));
const B=show('45yo, 10+ NCD, nobody else, no black box, claim likely, annual, 3-5wks',{age:'40-49',ncd:'10+',cover:'Comprehensive',job:'admin',household:'none',mileage:'low',excess:'250',claim:'likely',payment:'annual',blackbox:'no',renewal:'w3_5'});
ok('B: no drivers lever',!B.find(i=>i.id==='drivers')); ok('B: no black box lever',!B.find(i=>i.id==='blackbox')); ok('B: no monthly lever',!B.find(i=>i.id==='pay'));
ok('B: excess says keep low',B.find(i=>i.id==='excess').title.startsWith('Keep')); ok('B: job still offered',!!B.find(i=>i.id==='job'));
ok('B: mileage/value are skip',['mileage','value'].every(id=>B.find(i=>i.id===id).group==='skip'));
const C=show('same as A but community data published (-9% drivers, n=40)',{age:'25-29',ncd:'3-5',cover:'Comprehensive',job:'sales',household:'one',mileage:'mid',excess:'none',claim:'unlikely',payment:'annual',blackbox:'maybe',renewal:'gt5'},{add_named_driver:{n:40,published:true,medianPct:-9}});
ok('C: uses community figure',C.find(i=>i.id==='drivers').basis.includes('community median of 40'));
const D=advise({age:'30-39'}); ok('D: partial answers do not crash',D.length>0);
ok('questions: 11 steps, every option has value+label',STEPS.length===11&&STEPS.every(s=>s.options.length>=2&&s.options.every(o=>o.value&&o.label)));
ok('no banned phrasing (cheapest title / lie / fake)',!JSON.stringify(A.concat(B,C)).match(/cheapest (job|title)|lie |fake|pretend/i));
// Low-fit items must never sit under "Start here"
{ let bad=0, n=0; const ages=['17-20','21-24','25-29','30-39','40-49','50-59','60+'], ncds=['0','1-2','3-5','6-9','10+'];
  for(const age of ages)for(const ncd of ncds)for(const household of ['none','one','two'])for(const blackbox of ['yes','maybe','no'])for(const claim of ['unlikely','maybe','likely']){ n++; for(const i of advise({age,ncd,cover:'Comprehensive',job:'professional',household,mileage:'mid',excess:'250',claim,payment:'monthly',blackbox,renewal:'w3_5'})) if(i.group==='start'&&i.band==='Low') bad++; }
  ok('no Low-fit item is ever in Start here ('+n+' profiles)',bad===0);
  const hi=advise({age:'17-20',ncd:'0',cover:'Comprehensive',job:'professional',household:'two',mileage:'mid',excess:'250',claim:'maybe',payment:'monthly',blackbox:'yes',renewal:'lt2'}); ok('young high-fit profile still leads with black box',hi[0].id==='blackbox'&&hi[0].group==='start');
}

// ---- Fog Off score: one number drives order and band
{ let badOrder=0, badBand=0, badMath=0, badRange=0, n=0;
  const ages=['17-20','21-24','25-29','30-39','40-49','50-59','60+'], ncds=['0','1-2','3-5','6-9','10+'];
  for(const age of ages)for(const ncd of ncds)for(const household of ['none','one','two'])for(const blackbox of ['yes','maybe','no'])for(const claim of ['unlikely','maybe','likely'])for(const renewal of ['new','lt2','w3_5']){ n++;
    const items=advise({age,ncd,cover:'Comprehensive',job:'professional',household,mileage:'mid',excess:'250',claim,payment:'monthly',blackbox,renewal});
    for(let i=1;i<items.length;i++) if(items[i-1].score<items[i].score) badOrder++;
    for(const it of items){ const shown=Math.round(it.score); const band=shown>=20?'High':shown>=8?'Medium':'Low'; if(it.band!==band) badBand++;
      if(Math.abs(it.score-it.effect*it.fit*it.evidence/10000)>1e-9) badMath++; if(it.score<0||it.score>100||it.effect>100||it.fit>100||it.evidence>100) badRange++; }
  }
  ok('list is always in descending score order ('+n+' profiles)',badOrder===0);
  ok('band always matches the whole-number score shown',badBand===0);
  ok('score is exactly effect x fit x evidence / 10000',badMath===0);
  ok('all parts and scores stay within 0 to 100',badRange===0);
  // the profile from the user's screenshot: High items always before Medium before Low
  const u=advise({age:'25-29',ncd:'3-5',cover:'Third party only',job:'associate',household:'one',mileage:'mid',excess:'250',claim:'unlikely',payment:'annual',blackbox:'no',renewal:'w2_3'});
  const seq=u.map(i=>i.band[0]).join('');
  ok("user's profile: High, then Medium, then Low (got "+seq+": "+u.map(i=>i.id+' '+Math.round(i.score)).join(', ')+")", /^H+M+L+$/.test(seq));
  ok('job title is no longer above a High item it scores below',u.findIndex(i=>i.id==='job')>u.findIndex(i=>i.id==='sites'));
  const y=advise({age:'17-20',ncd:'0',cover:'Comprehensive',job:'professional',household:'two',mileage:'mid',excess:'none',claim:'maybe',payment:'monthly',blackbox:'yes',renewal:'lt2'});
  ok('worked example in the guide: black box for a young driver = 47.5 (effect 95, fit 100, evidence 50)',y[0].id==='blackbox'&&y[0].effect===95&&y[0].fit===100&&y[0].evidence===50&&Math.abs(y[0].score-47.5)<1e-9);
  const j=y.find(i=>i.id==='job'); ok('worked example: job = 70 x 80% x 35% = 19.6, shown as 20 and High (band on the rounded score)',j.effect===70&&j.fit===80&&j.evidence===35&&Math.round(j.score)===20&&j.band==='High');
}
