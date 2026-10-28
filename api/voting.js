const {db,send,method}=require("../lib/server");
const DEFAULT={enabled:true,heading:"Vote for Anna MC",voteKeyName:"Vote Key for Legend Key",links:[],notes:"Vote on the sites below to support Anna MC."};
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const result=await db().query("SELECT setting_value FROM site_settings WHERE setting_key=$1",["voting_config"]);
  const config=result.rows[0]?.setting_value||DEFAULT;
  return send(res,200,{enabled:config.enabled!==false,heading:config.heading||DEFAULT.heading,voteKeyName:config.voteKeyName||DEFAULT.voteKeyName,notes:config.notes||DEFAULT.notes,links:Array.isArray(config.links)?config.links.filter(x=>x.active!==false):[]});
 }catch(e){console.error("public voting config",e.message);return send(res,200,{...DEFAULT,links:[],configured:false});}
};
