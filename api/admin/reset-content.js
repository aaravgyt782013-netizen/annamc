"use strict";
const {db,send,method,requireAdmin,requireRole,audit,parseBody}=require("../../lib/server");
async function safeAudit(...args){try{await audit(...args)}catch(e){console.error("content reset audit log failed:",e.message)}}
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
  await client.query("COMMIT");
  await safeAudit(user,"site.content.reset","site","old-content",{archivedProducts:products.rowCount,removedGamemodes:modes.rowCount,votingLinks:0,votingEnabled:false});
  return send(res,200,{ok:true,archivedProducts:products.rowCount,removedGamemodes:modes.rowCount,votingLinks:0,votingEnabled:false});
 }catch(e){if(client)await client.query("ROLLBACK").catch(()=>{});console.error("content reset API failure:",e?.code||"no-code",e?.message||e);let error="Could not clear old content. Check deployment logs for the database error.";if(e?.code==="42P01"||e?.code==="42703")error="Database schema is missing or outdated. Run the latest database/schema.sql, then retry.";else if(!process.env.DATABASE_URL)error="DATABASE_URL is missing from deployment environment variables.";else if(e?.code==="28P01"||e?.code==="3D000"||e?.code==="08001"||e?.code==="08006")error="Database connection failed. Check DATABASE_URL and database access settings.";return send(res,500,{error});}
 finally{if(client)client.release();}
};