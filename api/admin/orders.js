const { db, send, method, requireAdmin, requireRole, audit, parseBody } = require("../../lib/server");
module.exports = async function handler(req,res) {
  if (!method(req,res,["GET","PATCH"])) return;
  const user=await requireAdmin(req,res); if(!user)return;
  if (!requireRole(user,["owner","store_manager","support"],res)) return;
  try {
    const pool=db();
    if(req.method==="GET"){
      const limit=Math.min(Math.max(Number(req.query?.limit)||50,1),100);
      const result=await pool.query("SELECT id,minecraft_username,target_server,items,amount_paise,currency,status,payment_provider,provider_order_id,provider_payment_id,payment_verified_at,delivery_status,support_notes,created_at,updated_at FROM orders ORDER BY created_at DESC LIMIT $1",[limit]);
      return send(res,200,{orders:result.rows,notice:"Payment and delivery statuses are read-only here until verified payment webhooks and the delivery bridge are integrated."});
    }
    if(user.role==="support") {
      const body=parseBody(req); const id=String(body.id||""); const notes=String(body.support_notes||"");
      if(!/^[0-9a-f-]{36}$/i.test(id)||notes.length>2000)return send(res,400,{error:"Valid order id and support_notes (max 2000 characters) required"});
      const result=await pool.query("UPDATE orders SET support_notes=$2,updated_at=now() WHERE id=$1 RETURNING id,support_notes",[id,notes]);
      if(!result.rowCount)return send(res,404,{error:"Order not found"});
      await audit(user,"order.notes.update","order",id); return send(res,200,{order:result.rows[0]});
    }
    const body=parseBody(req); const id=String(body.id||""); const notes=String(body.support_notes||"");
    if(!/^[0-9a-f-]{36}$/i.test(id)||notes.length>2000)return send(res,400,{error:"Valid order id and support_notes (max 2000 characters) required"});
    const result=await pool.query("UPDATE orders SET support_notes=$2,updated_at=now() WHERE id=$1 RETURNING id,support_notes",[id,notes]);
    if(!result.rowCount)return send(res,404,{error:"Order not found"});
    await audit(user,"order.notes.update","order",id); return send(res,200,{order:result.rows[0]});
  }catch(e){console.error("orders API",e.message);return send(res,500,{error:"Order operation failed"});}
};
