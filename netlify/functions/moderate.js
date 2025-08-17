// netlify/functions/moderate.js
const fs=require('fs'); const path=require('path');
const DB = p => path.join(__dirname,'..','..','data',p);
function readJSON(n,f){ try{return JSON.parse(fs.readFileSync(DB(n),'utf8'))}catch{ return f; } }
function writeJSON(n,d){ fs.mkdirSync(path.dirname(DB(n)),{recursive:true}); fs.writeFileSync(DB(n), JSON.stringify(d,null,2)); }
exports.handler = async (event)=>{
  if (event.httpMethod!=='POST') return {statusCode:405, body:'Method Not Allowed'};
  const { userId, action } = JSON.parse(event.body||'{}');
  let users = readJSON('users.json', []);
  const idx = users.findIndex(u=>String(u.id)===String(userId));
  if (idx<0) return { statusCode:404, body: JSON.stringify({ok:false, error:'user not found'})};
  if (action==='validate') users[idx].status='active';
  else if (action==='suspend') users[idx].status='suspended';
  else if (action==='delete') users = users.filter((_,i)=>i!==idx);
  writeJSON('users.json', users);
  return { statusCode:200, body: JSON.stringify({ok:true}) };
};
