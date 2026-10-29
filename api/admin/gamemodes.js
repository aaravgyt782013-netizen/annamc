"use strict";
const {db,send,method,requireAdmin,requireRole,audit,parseBody}=require("../../lib/server");
async function safeAudit(...args){try{await audit(...args)}catch(e){console.error("audit logging failed:",e.message)}}
function friendlyAdminError(e, label){
 if(e?.code==="42P01"||e?.code==="42703")return label+" database table/column is missing or outdated. Run the latest database/schema.sql in your database SQL editor, then retry.";
 if(e?.code==="23505")return "This "+label.toLowerCase()+" already exists. Refresh the panel and check for a duplicate.";
 if(e?.code==="23514"||e?.code==="22P02"||e?.code==="22003")return "The database rejected one or more fields. Check the values and try again.";
 if(!process.env.DATABASE_URL)return "DATABASE_URL is missing from the deployment environment variables.";
 if(e?.code==="28P01"||e?.code==="3D000"||e?.code==="08001"||e?.code==="08006")return "Database connection failed. Check DATABASE_URL and database access settings in Antideploy.";
 console.error(label+" API failure:",e?.code||"no-code",e?.message||e);
 return label+" could not be saved. The server or database rejected the request; check deployment logs for the detailed cause.";
}
const validId=v=>typeof v==="string"&&/^[a-z0-9][a-z0-9_-]{1,63}$/.test(v);
module.exports=async function handler(req,res){
 if(!method(req,res,["GET","POST","PATCH","DELETE"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  const pool=db();
  if(req.method==="GET"){const r=await pool.query("SELECT id,name,description,server_address,version,status,active,sort_order,created_at,updated_at FROM game_modes ORDER BY sort_order,name");return send(res,200,{gamemodes:r.rows});}
  if(req.method==="DELETE"){
   if(req.query?.all==="1"){const r=await pool.query("DELETE FROM game_modes");await safeAudit(user,"gamemode.remove_all","game_mode",null,{removed:r.rowCount});return send(res,200,{ok:true,removed:r.rowCount});}
   const id=String(req.query?.id||"");if(!validId(id))return send(res,400,{error:"A valid game mode id is required"});
   const r=await pool.query("DELETE FROM game_modes WHERE id=$1",[id]);if(!r.rowCount)return send(res,404,{error:"Game mode not found"});await safeAudit(user,"gamemode.delete","game_mode",id);return send(res,200,{ok:true,removed:1});
  }
  const body=parseBody(req),creating=req.method==="POST",id=creating?body.id:String(req.query?.id||body.id||"");
  if(!validId(id))return send(res,400,{error:"Invalid game mode id"});
  const fields=["name","description","server_address","version","status","active","sort_order"];
  if(creating){
   const v={name:body.name,description:body.description||"",server_address:body.server_address||"",version:body.version||"1.21.x",status:body.status||"online",active:body.active!==false,sort_order:Number.isInteger(body.sort_order)?body.sort_order:100};
   if(typeof v.name!=="string"||!v.name.trim()||v.name.length>80||typeof v.description!=="string"||v.description.length>1000||typeof v.server_address!=="string"||v.server_address.length>200||typeof v.version!=="string"||v.version.length>40||!["online","maintenance","offline"].includes(v.status))return send(res,400,{error:"Invalid game mode fields"});
   const r=await pool.query("INSERT INTO game_modes(id,name,description,server_address,version,status,active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[id,v.name.trim(),v.description,v.server_address,v.version,v.status,v.active,v.sort_order]);await safeAudit(user,"gamemode.create","game_mode",id,{status:v.status});return send(res,201,{gamemode:r.rows[0]});
  }
  const updates=[],values=[id];
  for(const f of fields)if(Object.prototype.hasOwnProperty.call(body,f)){const v=body[f];if(f==="name"&&(typeof v!=="string"||!v.trim()||v.length>80))return send(res,400,{error:"Invalid name"});if(f==="description"&&(typeof v!=="string"||v.length>1000))return send(res,400,{error:"Invalid description"});if(f==="server_address"&&(typeof v!=="string"||v.length>200))return send(res,400,{error:"Invalid server address"});if(f==="version"&&(typeof v!=="string"||v.length>40))return send(res,400,{error:"Invalid version"});if(f==="status"&&!["online","maintenance","offline"].includes(v))return send(res,400,{error:"Invalid status"});if(f==="active"&&typeof v!=="boolean")return send(res,400,{error:"active must be boolean"});if(f==="sort_order"&&!Number.isInteger(v))return send(res,400,{error:"Invalid sort order"});values.push(f==="name"?v.trim():v);updates.push(f+"=$"+values.length);}
  if(!updates.length)return send(res,400,{error:"No editable fields provided"});updates.push("updated_at=now()");
  const r=await pool.query("UPDATE game_modes SET "+updates.join(",")+" WHERE id=$1 RETURNING *",values);if(!r.rowCount)return send(res,404,{error:"Game mode not found"});await safeAudit(user,"gamemode.update","game_mode",id,{fields});return send(res,200,{gamemode:r.rows[0]});
 }catch(e){return send(res,500,{error:friendlyAdminError(e,"Game mode")});}
};