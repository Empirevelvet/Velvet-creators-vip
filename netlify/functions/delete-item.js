// netlify/functions/delete-item.js
const fs=require('fs'); const path=require('path');
const DB = p => path.join(__dirname,'..','..','data',p);
function readJSON(n,f){ try{return JSON.parse(fs.readFileSync(DB(n),'utf8'))}catch{ return f; } }
function writeJSON(n,d){ fs.mkdirSync(path.dirname(DB(n)),{recursive:true}); fs.writeFileSync(DB(n), JSON.stringify(d,null,2)); }
exports.handler = async (event)=>{
  if (event.httpMethod!=='POST') return {statusCode:405, body:'Method Not Allowed'};
  const { id } = JSON.parse(event.body||'{}');
  const items = readJSON('items.json', []);
  const kept = items.filter(x=>String(x.id)!==String(id));
  writeJSON('items.json', kept);
  return { statusCode:200, body: JSON.stringify({ ok:true }) };
};
