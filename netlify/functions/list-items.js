// netlify/functions/list-items.js
const fs=require('fs'); const path=require('path');
const DB = p => path.join(__dirname,'..','..','data',p);
function readJSON(n,f){ try{return JSON.parse(fs.readFileSync(DB(n),'utf8'))}catch{ return f; } }
exports.handler = async ()=> {
  const items = readJSON('items.json', []); // [{id,creator,type,title,price,sku,visibility,desc}]
  return { statusCode:200, body: JSON.stringify({ items }) };
};
