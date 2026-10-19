// Run with: npm test
import { readFileSync } from 'node:fs'; import { SCHEMA_STATEMENTS } from './.build/schema.mjs';
const norm=(s)=>s.replace(/--.*$/gm,'').replace(/\s+/g,' ').replace(/\s*\(\s*/g,'(').replace(/\s*\)\s*/g,')').replace(/\s*,\s*/g,',').replace(/;\s*$/,'').trim().toLowerCase();
const sql=readFileSync(new URL('../db/schema.sql', import.meta.url),'utf8').split(';').map(norm).filter(Boolean);
const ts=SCHEMA_STATEMENTS.map(norm);
const same=sql.length===ts.length && sql.every((q,i)=>q===ts[i]);
console.log(same?'PASS':'FAIL','db/schema.sql matches src/lib/schema-sql.ts ('+ts.length+' statements)'); if(!same){ sql.forEach((q,i)=>{ if(q!==ts[i]) console.log('SQL:',q,'\nTS :',ts[i]) }) }
