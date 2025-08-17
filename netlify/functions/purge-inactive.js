// netlify/functions/purge-inactive.js
const fs=require('fs'); const path=require('path');
const DB = p => path.join(__dirname,'..','..','data',p);
function readJSON(n,f){ try{return JSON.parse(fs.readFileSync(DB(n),'utf8'))}catch{ return f; } }
function writeJSON(n,d){ fs.mkdirSync(path.dirname(DB(n)),{recursive:true}); fs.writeFileSync(DB(n), JSON.stringify(d,null,2)); }
exports.handler = async ()=>{
  const users = readJSON('users.json', []);
  const limit = Date.now() - 90*24*60*60*1000;
  const kept = users.filter(u => new Date(u.lastSeen||0).getTime() >= limit);
  const removed = users.length - kept.length;
  writeJSON('users.json', kept);
  return { statusCode:200, body: JSON.stringify({ ok:true, count:removed }) };
};
