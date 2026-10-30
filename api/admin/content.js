"use strict";
const {db,send,method,requireAdmin,requireRole,audit,parseBody}=require("../../lib/server");
const {DEFAULT_CONTENT,normalizeContent}=require("../../lib/site-content");
const KEY="site_content";
module.exports=async function handler(req,res){
 if(!method(req,res,["GET","PUT"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  const pool=db();
  if(req.method==="GET"){
   const r=await pool.query("SELECT setting_value,updated_at,updated_by FROM site_settings WHERE setting_key=$1",[KEY]);
   return send(res,200,{content:normalizeContent(r.rows[0]?.setting_value||DEFAULT_CONTENT),updatedAt:r.rows[0]?.updated_at||null,updatedBy:r.rows[0]?.updated_by||null});
  }
  const body=parseBody(req);
  const content=normalizeContent(body.content);
  await pool.query("INSERT INTO site_settings(setting_key,setting_value,updated_by,updated_at) VALUES($1,$2::jsonb,$3,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=now()",[KEY,JSON.stringify(content),user.email]);
  try{await audit(user,"site.content.update","site_settings",KEY,{sections:Object.keys(content),highlightCount:content.home.highlights.length})}catch(e){console.error("website content audit failed:",e.message)}
  return send(res,200,{ok:true,content,updatedAt:new Date().toISOString()});
 }catch(e){
  console.error("website CMS API failure:",e?.code||"no-code",e?.message||e);
  if(e?.code==="42P01"||e?.code==="42703")return send(res,500,{error:"The database is missing the site_settings table. Run the latest schema repair, then retry."});
  if(!process.env.DATABASE_URL)return send(res,500,{error:"DATABASE_URL is missing from the deployment environment variables."});
  return send(res,500,{error:"Website content could not be saved. Check the database connection and deployment logs."});
 }
};
