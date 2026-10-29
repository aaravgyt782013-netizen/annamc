"use strict";
const {db,send,method,requireAdmin,requireRole}=require("../../lib/server");
const required=["products","orders","announcements","staff_users","audit_logs","site_settings","game_modes","login_attempts"];
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  const pool=db();
  await pool.query("SELECT 1");
  const result=await pool.query("SELECT name, to_regclass('public.'||name) IS NOT NULL AS exists FROM unnest($1::text[]) AS name", [required]);
  const byName=new Map(result.rows.map(r=>[r.name,Boolean(r.exists)]));
  return send(res,200,{server:"running",database:true,tables:required.map(name=>({name,exists:byName.get(name)||false})),environment:{databaseUrlConfigured:Boolean(process.env.DATABASE_URL),sessionSecretConfigured:Boolean(process.env.ANNA_SESSION_SECRET&&process.env.ANNA_SESSION_SECRET.length>=32),adminPasswordConfigured:Boolean(process.env.ANNA_ADMIN_PASSWORD)}});
 }catch(e){
  console.error("admin health check failed:",e?.code||"no-code",e?.message||e);
  return send(res,200,{server:"running",database:false,tables:required.map(name=>({name,exists:false})),environment:{databaseUrlConfigured:Boolean(process.env.DATABASE_URL),sessionSecretConfigured:Boolean(process.env.ANNA_SESSION_SECRET&&process.env.ANNA_SESSION_SECRET.length>=32),adminPasswordConfigured:Boolean(process.env.ANNA_ADMIN_PASSWORD)},error:!process.env.DATABASE_URL?"DATABASE_URL is missing.":e?.code==="28P01"?"Database authentication failed; check DATABASE_URL.":"Database connection/query failed. Check Antideploy logs and DATABASE_URL."});
 }
};
