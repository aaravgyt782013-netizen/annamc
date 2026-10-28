const {db,send,method}=require("../lib/server");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const result=await db().query("SELECT status_value,updated_at FROM network_status WHERE status_key=$1",["velocity"]);
  const row=result.rows[0];
  if(!row)return send(res,200,{configured:false,updatedAt:null,network:{online:false,playersOnline:0,maxPlayers:0},servers:{lifesteal:{online:false,playersOnline:0,maxPlayers:0},practice:{online:false,playersOnline:0,maxPlayers:0}}});
  const age=Date.now()-new Date(row.updated_at).getTime();
  const data=row.status_value||{};
  const stale=age>90000;
  return send(res,200,{configured:true,stale,updatedAt:row.updated_at,network:{online:!stale&&data.network?.online===true,playersOnline:stale?0:Number(data.network?.playersOnline||0),maxPlayers:Number(data.network?.maxPlayers||0)},servers:Object.fromEntries(["lifesteal","practice"].map(k=>{const v=data.servers?.[k]||{};return [k,{online:!stale&&v.online===true,playersOnline:stale?0:Number(v.playersOnline||0),maxPlayers:Number(v.maxPlayers||0)}]}))});
 }catch(e){console.error("status read",e.message);return send(res,200,{configured:false,unavailable:true,network:{online:false,playersOnline:0,maxPlayers:0},servers:{lifesteal:{online:false,playersOnline:0,maxPlayers:0},practice:{online:false,playersOnline:0,maxPlayers:0}}});}
};
