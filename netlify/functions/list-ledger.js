// netlify/functions/list-ledger.js
const fs = require('fs');
const path = require('path');
const DB = p => path.join(__dirname, '..', '..', 'data', p);
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(DB(name), 'utf8')); }
  catch { return fallback; }
}
exports.handler = async (event) => {
  // Data files
  const sales   = readJSON('sales.json',   []);      // [{id,date,creator,type,amount,txn,clientEmail,paid}]
  const users   = readJSON('users.json',   []);      // [{id,username,email,role,status,createdAt,lastSeen}]
  // KPIs simples
  const now = Date.now();
  const online  = users.filter(u => (now - (new Date(u.lastSeen||0)).getTime()) < 5*60*1000).length;
  const pending = users.filter(u => u.status==='pending').length;
  const today   = sales.filter(s => new Date(s.date).toDateString()===new Date().toDateString())
                       .reduce((a,s)=>a+Number(s.amount||0),0);
  const dueTotal= sales.filter(s => !s.paid).reduce((a,s)=>a+Number(s.amount||0)*0.70,0); // impayé part créatrice

  // recap créatrices
  const creatorsMap = {};
  for (const s of sales) {
    const k = s.creator || '—';
    creatorsMap[k] = creatorsMap[k] || { total:0, due:0 };
    creatorsMap[k].total += Number(s.amount||0);
    if (!s.paid) creatorsMap[k].due += Number(s.amount||0)*0.70;
  }

  // CSV export
  if ((event.queryStringParameters||{}).format === 'csv') {
    const head = ['date','creator','type','amount','txn','clientEmail','paid'];
    const lines = [head.join(',')].concat(
      sales.map(s => head.map(k => `"${String(s[k]??'').replace(/"/g,'""')}"`).join(','))
    ).join('\n');
    return { statusCode:200, headers:{'Content-Type':'text/csv'}, body:lines };
  }

  const body = {
    online, pending,
    totals: { today, due: dueTotal },
    last: [...sales].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10),
    ledger: [...sales].sort((a,b)=>new Date(b.date)-new Date(a.date)),
    creators: creatorsMap
  };
  return { statusCode:200, body: JSON.stringify(body) };
};
