"use strict";
const {db,send,method}=require("../lib/server");
const {DEFAULT_CONTENT,normalizeContent}=require("../lib/site-content");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const r=await db().query("SELECT setting_value,updated_at FROM site_settings WHERE setting_key=$1",["site_content"]);
  return send(res,200,{content:normalizeContent(r.rows[0]?.setting_value||DEFAULT_CONTENT),updatedAt:r.rows[0]?.updated_at||null});
 }catch(e){
  console.error("public CMS content unavailable:",e?.code||"no-code",e?.message||e);
  return send(res,200,{content:DEFAULT_CONTENT,previewFallback:true});
 }
};
