"use strict";
const {db,send,method,requireAdmin,requireRole,audit,parseBody}=require("../../lib/server");
const KEY="site_config";
const DEFAULT={theme:{},textOverrides:{},hideSelectors:[]};
function validateConfig(value){
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Configuration must be a JSON object.");
 const config={theme:{},textOverrides:{},hideSelectors:[]};
 const theme=value.theme||{};
 if(typeof theme!=="object"||Array.isArray(theme))throw new Error("theme must be an object of CSS custom properties.");
 for(const [key,val] of Object.entries(theme)){
  if(!/^--[a-zA-Z0-9_-]{1,60}$/.test(key)||typeof val!=="string"||val.length>120||/[;{}<>]/.test(val))throw new Error("Invalid theme property or value: "+key);
  config.theme[key]=val;
 }
 const text=value.textOverrides||{};
 if(typeof text!=="object"||Array.isArray(text))throw new Error("textOverrides must be a CSS-selector-to-text object.");
 if(Object.keys(text).length>200)throw new Error("You can set up to 200 text overrides.");
 for(const [selector,val] of Object.entries(text)){
  if(!selector.trim()||selector.length>200||typeof val!=="string"||val.length>2000)throw new Error("Invalid text override.");
  config.textOverrides[selector]=val;
 }
 const hidden=value.hideSelectors||[];
 if(!Array.isArray(hidden)||hidden.length>100||hidden.some(x=>typeof x!=="string"||!x.trim()||x.length>200))throw new Error("hideSelectors must be an array of up to 100 CSS selectors.");
 config.hideSelectors=hidden;
 return config;
}
module.exports=async function handler(req,res){
 if(!method(req,res,["GET","PUT"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  if(req.method==="GET"){
   const r=await db().query("SELECT setting_value FROM site_settings WHERE setting_key=$1",[KEY]);
   return send(res,200,{config:r.rows[0]?.setting_value||DEFAULT});
  }
  const body=parseBody(req);let config;
  try{config=validateConfig(body.config)}catch(e){return send(res,400,{error:e.message})}
  await db().query("INSERT INTO site_settings(setting_key,setting_value,updated_by,updated_at) VALUES($1,$2::jsonb,$3,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=now()",[KEY,JSON.stringify(config),user.email]);
  try{await audit(user,"site.config.update","site_settings",KEY,{themeKeys:Object.keys(config.theme),textOverrideCount:Object.keys(config.textOverrides).length,hiddenSelectorCount:config.hideSelectors.length})}catch(e){console.error("site config audit failed:",e.message)}
  return send(res,200,{ok:true,config});
 }catch(e){
  console.error("site config API failure:",e?.code||"no-code",e?.message||e);
  if(e?.code==="42P01"||e?.code==="42703")return send(res,500,{error:"Database schema is missing or outdated. Run the latest database/schema.sql, then retry."});
  if(!process.env.DATABASE_URL)return send(res,500,{error:"DATABASE_URL is missing from deployment environment variables."});
  return send(res,500,{error:"Website settings could not be loaded or saved. Check the deployment logs and database connection."});
 }
};
