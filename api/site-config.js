"use strict";
const {db,send,method}=require("../lib/server");
const DEFAULT={theme:{},textOverrides:{},hideSelectors:[]};
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const r=await db().query("SELECT setting_value FROM site_settings WHERE setting_key=$1",["site_config"]);
  return send(res,200,{config:r.rows[0]?.setting_value||DEFAULT});
 }catch(e){
  console.error("public site config API failure:",e?.code||"no-code",e?.message||e);
  if(e?.code==="42P01"||e?.code==="42703")return send(res,200,{config:DEFAULT,warning:"Database schema is not installed."});
  return send(res,503,{error:"Website configuration is temporarily unavailable."});
 }
};
