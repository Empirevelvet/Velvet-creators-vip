// netlify/functions/list-users.js
const fs=require('fs'); const path=require('path');
const DB = p => path.join(__dirname,'..','..','data',p);
function readJSON(n,f){ try{return JSON.parse(fs.readFileSync(DB(n),'utf8'))}catch{ return f; } }
exports.handler = async ()=>{
  const users = readJSON('users.json', []); // [{id,username,email,role,status,createdAt,lastSeen}]
  return { statusCode:200, body: JSON.stringify({ users }) };
};
