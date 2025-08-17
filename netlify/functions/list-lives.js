// netlify/functions/list-lives.js
exports.handler = async ()=>{
  const items = [
    { room:'live_abc', creator:'@sofia', status:'scheduled', viewers:0, startAt:Date.now()+3600000, adminUrl:'#' }
  ];
  return { statusCode:200, body: JSON.stringify({ items }) };
};
