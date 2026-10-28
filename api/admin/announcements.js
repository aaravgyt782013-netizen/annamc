const { db, send, method, requireAdmin, requireRole, audit, parseBody } = require("../../lib/server");
module.exports = async function handler(req,res) {
  if(!method(req,res,["GET","POST","PATCH","DELETE"]))return;
  const user=await requireAdmin(req,res);if(!user)return;
  if(!requireRole(user,["owner","store_manager"],res))return;
  try{
    const pool=db();
    if(req.method==="GET"){const result=await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");return send(res,200,{announcements:result.rows});}
    const body=parseBody(req);
    if(req.method==="POST"){
      const title=String(body.title||"").trim(), content=String(body.body||"");
      if(!title||title.length>120||!content.trim()||content.length>4000)return send(res,400,{error:"Title (max 120) and body (max 4000) are required"});
      const result=await pool.query("INSERT INTO announcements(title,body,active,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[title,content,body.active!==false,body.starts_at||null,body.ends_at||null,user.email]);
      await audit(user,"announcement.create","announcement",result.rows[0].id);return send(res,201,{announcement:result.rows[0]});
    }
    const id=String(body.id||req.query?.id||"");
    if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{error:"Valid announcement id required"});
    if(req.method==="DELETE"){await pool.query("UPDATE announcements SET active=false,updated_at=now() WHERE id=$1",[id]);await audit(user,"announcement.archive","announcement",id);return send(res,200,{ok:true,archived:true});}
    const sets=[],values=[id];
    for(const field of ["title","body","active","starts_at","ends_at"]){if(!(field in body))continue;let value=body[field];if(field==="title"&&(typeof value!=="string"||!value.trim()||value.length>120))return send(res,400,{error:"Invalid title"});if(field==="body"&&(typeof value!=="string"||!value.trim()||value.length>4000))return send(res,400,{error:"Invalid body"});if(field==="active"&&typeof value!=="boolean")return send(res,400,{error:"active must be boolean"});values.push(value);sets.push(field+"=$"+values.length);}
    if(!sets.length)return send(res,400,{error:"No editable fields"});
    sets.push("updated_at=now()");
    const result=await pool.query("UPDATE announcements SET "+sets.join(",")+" WHERE id=$1 RETURNING *",values);
    if(!result.rowCount)return send(res,404,{error:"Announcement not found"});
    await audit(user,"announcement.update","announcement",id);return send(res,200,{announcement:result.rows[0]});
  }catch(e){console.error("announcements API",e.message);return send(res,500,{error:"Announcement operation failed"});}
};
