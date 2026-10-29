"use strict";
const {db,send,method,requireAdmin,requireRole,audit,parseBody}=require("../../lib/server");
module.exports=async function handler(req,res){
 if(!method(req,res,["POST"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 if(parseBody(req).confirm!=="CLEAR_OLD_CONTENT")return send(res,400,{error:"Explicit confirmation is required"});
 const pool=db();let client;
 try{
  client=await pool.connect();await client.query("BEGIN");
  const products=await client.query("UPDATE products SET active=false,updated_at=now() WHERE active=true");
  const modes=await client.query("DELETE FROM game_modes");
  const config={enabled:false,heading:"Vote for Anna MC",voteKeyName:"Vote reward",notes:"Voting is currently disabled. Check back later.",links:[]};
  await client.query("INSERT INTO site_settings(setting_key,setting_value,updated_by,updated_at) VALUES($1,$2::jsonb,$3,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=now()",["voting_config",JSON.stringify(config),user.email]);
  await client.query("INSERT INTO audit_logs(actor_email,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)",[user.email,"site.content.reset","site","old-content",JSON.stringify({archivedProducts:products.rowCount,removedGamemodes:modes.rowCount,votingLinks:0,votingEnabled:false})]);
  await client.query("COMMIT");
  return send(res,200,{ok:true,archivedProducts:products.rowCount,removedGamemodes:modes.rowCount,votingLinks:0,votingEnabled:false});
 }catch(e){if(client)await client.query("ROLLBACK").catch(()=>{});console.error("content reset API",e.message);return send(res,500,{error:"Could not clear old content. Confirm database/schema.sql is installed and includes game_modes, site_settings, and audit_logs."});}
 finally{if(client)client.release();}
};