const {db,send,method,requireAdmin,requireRole}=require("../../lib/server");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{const limit=Math.min(Math.max(Number(req.query?.limit)||50,1),100);const result=await db().query("SELECT id,actor_email,action,entity_type,entity_id,details,created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1",[limit]);return send(res,200,{logs:result.rows});}
 catch(e){console.error("audit API",e.message);return send(res,500,{error:"Audit log unavailable"});}
};
