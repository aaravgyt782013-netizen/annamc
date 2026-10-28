const crypto=require("node:crypto");
const {db,send,method,parseBody}=require("../../lib/server");
function equal(a,b){const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
module.exports=async function handler(req,res){
 if(!method(req,res,["POST"]))return;
 const expected=String(process.env.VELOCITY_STATUS_TOKEN||"");
 if(expected.length<32)return send(res,503,{error:"Status bridge is not configured"});
 if(!equal(req.headers["x-anna-status-token"],expected))return send(res,401,{error:"Unauthorized"});
 try{
  const b=parseBody(req);
  if(!b||!b.network||!b.servers||!b.servers.lifesteal||!b.servers.practice)return send(res,400,{error:"Invalid status payload"});
  const cleanCount=v=>Number.isInteger(v)&&v>=0&&v<=100000?v:0;
  const cleanServer=v=>({online:v.online===true,playersOnline:cleanCount(v.playersOnline),maxPlayers:cleanCount(v.maxPlayers)});
  const data={network:{online:b.network.online===true,playersOnline:cleanCount(b.network.playersOnline),maxPlayers:cleanCount(b.network.maxPlayers)},servers:{lifesteal:cleanServer(b.servers.lifesteal),practice:cleanServer(b.servers.practice)}};
  await db().query("INSERT INTO network_status(status_key,status_value,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(status_key) DO UPDATE SET status_value=EXCLUDED.status_value,updated_at=now()",["velocity",JSON.stringify(data)]);
  return send(res,200,{ok:true});
 }catch(e){console.error("status update",e.message);return send(res,500,{error:"Could not save status"});}
};
