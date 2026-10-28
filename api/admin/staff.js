const bcrypt=require("bcryptjs");
const {db,send,method,requireAdmin,requireRole,audit,parseBody,validEmail}=require("../../lib/server");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET","POST","PATCH","DELETE"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  const pool=db();
  if(req.method==="GET"){const result=await pool.query("SELECT email,role,active,created_at,updated_at FROM staff_users ORDER BY created_at DESC");return send(res,200,{staff:result.rows});}
  const body=parseBody(req),email=String(body.email||"").trim().toLowerCase();
  if(!validEmail(email)||email===String(process.env.ANNA_ADMIN_EMAIL||"").toLowerCase())return send(res,400,{error:"Provide a valid non-owner staff email"});
  if(req.method==="POST"){
   const password=String(body.password||""),role=body.role;
   if(password.length<12||password.length>200||!["store_manager","support"].includes(role))return send(res,400,{error:"Staff password must be at least 12 characters and role must be store_manager or support"});
   const hash=await bcrypt.hash(password,12);
   await pool.query("INSERT INTO staff_users(email,password_hash,role,active) VALUES($1,$2,$3,true)",[email,hash,role]);
   await audit(user,"staff.create","staff_user",email,{role});
   return send(res,201,{staff:{email,role,active:true}});
  }
  if(req.method==="DELETE"){await pool.query("UPDATE staff_users SET active=false,updated_at=now() WHERE lower(email)=lower($1)",[email]);await audit(user,"staff.deactivate","staff_user",email);return send(res,200,{ok:true,active:false});}
  const sets=[],values=[email];
  if(body.role!==undefined){if(!["store_manager","support"].includes(body.role))return send(res,400,{error:"Invalid role"});values.push(body.role);sets.push("role=$"+values.length);}
  if(body.active!==undefined){if(typeof body.active!=="boolean")return send(res,400,{error:"active must be boolean"});values.push(body.active);sets.push("active=$"+values.length);}
  if(body.password!==undefined){const password=String(body.password);if(password.length<12||password.length>200)return send(res,400,{error:"Password must be at least 12 characters"});values.push(await bcrypt.hash(password,12));sets.push("password_hash=$"+values.length);}
  if(!sets.length)return send(res,400,{error:"Provide role, active, or password"});
  sets.push("updated_at=now()");
  const result=await pool.query("UPDATE staff_users SET "+sets.join(",")+" WHERE lower(email)=lower($1) RETURNING email,role,active,updated_at",values);
  if(!result.rowCount)return send(res,404,{error:"Staff user not found"});
  await audit(user,"staff.update","staff_user",email,{fields:Object.keys(body).filter(k=>["role","active","password"].includes(k))});
  return send(res,200,{staff:result.rows[0]});
 }catch(e){console.error("staff API",e.message);return send(res,500,{error:"Staff operation failed"});}
};
