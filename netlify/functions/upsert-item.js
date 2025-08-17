// netlify/functions/upsert-item.js
const fs=require('fs'); const path=require('path');
const DB = p => path.join(__dirname,'..','..','data',p);
function readJSON(n,f){ try{return JSON.parse(fs.readFileSync(DB(n),'utf8'))}catch{ return f; } }
function writeJSON(n,d){ fs.mkdirSync(path.dirname(DB(n)),{recursive:true}); fs.writeFileSync(DB(n), JSON.stringify(d,null,2)); }
exports.handler = async (event)=>{
  if (event.httpMethod!=='POST') return {statusCode:405, body:'Method Not Allowed'};
  const payload = JSON.parse(event.body||'{}');
  let items = readJSON('items.json', []);
  if (payload.id){
    const idx = items.findIndex(x=>String(x.id)===String(payload.id));
    if (idx>=0) items[idx] = {...items[idx], ...payload};
  } else {
    payload.id = Date.now().toString(36);
    items.push(payload);
  }
  writeJSON('items.json', items);
  return { statusCode:200, body: JSON.stringify({ ok:true, id: payload.id }) };
};
