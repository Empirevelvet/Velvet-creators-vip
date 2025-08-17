// netlify/functions/mark-paid.js
const fs = require('fs'); const path = require('path');
const DB = p => path.join(__dirname, '..', '..', 'data', p);
function readJSON(name,fallback){ try{return JSON.parse(fs.readFileSync(DB(name),'utf8'))}catch{ return fallback; } }
function writeJSON(name,data){ fs.mkdirSync(path.dirname(DB(name)),{recursive:true}); fs.writeFileSync(DB(name), JSON.stringify(data,null,2)); }
exports.handler = async (event)=>{
  if (event.httpMethod!=='POST') return {statusCode:405, body:'Method Not Allowed'};
  const { id, creatorId } = JSON.parse(event.body||'{}');
  const sales = readJSON('sales.json', []);
  let updated = 0;
  if (id && String(id).startsWith('creator:')) {
    const name = String(id).slice('creator:'.length);
    for (const s of sales) if (s.creator===name && !s.paid){ s.paid=true; updated++; }
  } else if (creatorId) {
    for (const s of sales) if (s.creator===creatorId && !s.paid){ s.paid=true; updated++; }
  } else if (id) {
    const s = sales.find(x=>String(x.id)===String(id)); if (s && !s.paid){ s.paid = true; updated = 1; }
  }
  writeJSON('sales.json', sales);
  return { statusCode:200, body: JSON.stringify({ ok:true, updated }) };
};
