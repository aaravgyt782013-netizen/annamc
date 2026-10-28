const {db,send,method,requireAdmin,requireRole,audit,parseBody}=require("../../lib/server");
const KEY="voting_config";
const DEFAULT={enabled:true,heading:"Vote for Anna MC",voteKeyName:"Vote Key",links:[],notes:"Vote on the sites below to support Anna MC."};
function normalize(v){
 if(!v||typeof v!=="object"||Array.isArray(v))throw new Error("Settings must be a JSON object");
 const enabled=v.enabled!==false;
 const heading=String(v.heading??DEFAULT.heading).trim();
 const voteKeyName=String(v.voteKeyName??DEFAULT.voteKeyName).trim();
 const notes=String(v.notes??DEFAULT.notes).trim();
 if(!heading||heading.length>120||!voteKeyName||voteKeyName.length>80||notes.length>1000)throw new Error("Heading/key name/notes exceed allowed lengths");
 if(!Array.isArray(v.links)||v.links.length>30)throw new Error("Links must be an array of at most 30 entries");
 const links=v.links.map((x,i)=>{
  const label=String(x.label||"").trim(),url=String(x.url||"").trim();
  let parsed;try{parsed=new URL(url)}catch{throw new Error("Voting link "+(i+1)+" must be a valid https URL")}
  if(!label||label.length>80||parsed.protocol!=="https:")throw new Error("Voting links need a label and HTTPS URL");
  return {id:String(x.id||("vote-"+(i+1))).slice(0,64),label,url:parsed.toString(),active:x.active!==false};
 });
 return {enabled,heading,voteKeyName,notes,links};
}
module.exports=async function handler(req,res){
 if(!method(req,res,["GET","PUT"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  const pool=db();
  if(req.method==="GET"){
   const result=await pool.query("SELECT setting_value FROM site_settings WHERE setting_key=$1",[KEY]);
   return send(res,200,{config:result.rows[0]?.setting_value||DEFAULT});
  }
  const body=parseBody(req);
  let config;try{config=normalize(body.config)}catch(e){return send(res,400,{error:e.message})}
  await pool.query("INSERT INTO site_settings(setting_key,setting_value,updated_by,updated_at) VALUES($1,$2::jsonb,$3,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=now()",[KEY,JSON.stringify(config),user.email]);
  await audit(user,"voting.config.update","site_settings",KEY,{linkCount:config.links.length,enabled:config.enabled});
  return send(res,200,{ok:true,config});
 }catch(e){console.error("voting config API",e.message);return send(res,500,{error:"Voting settings unavailable. Ensure the updated database/schema.sql has been run in Neon."})}
};
