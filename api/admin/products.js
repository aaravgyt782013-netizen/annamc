const { db, send, method, requireAdmin, requireRole, audit, parseBody } = require("../../lib/server");
const validId = v => typeof v === "string" && /^[a-z0-9][a-z0-9_-]{1,63}$/.test(v);\nasync function safeAudit(...args) { try { await audit(...args); } catch (e) { console.error("products audit log failed:", e.message); } }\nfunction friendlyDatabaseError(e) {\n  if (e?.code === "42P01" || e?.code === "42703") return "Database schema is missing or outdated. Run the latest database/schema.sql in your database SQL editor, then retry.";\n  if (e?.code === "23505") return "A product with this ID already exists. Edit the existing product or choose a different Product ID.";\n  if (e?.code === "23514" || e?.code === "22P02" || e?.code === "22003") return "Some product fields are not accepted by the database. Check the server, price, ID, and rank group values.";\n  if (!process.env.DATABASE_URL) return "DATABASE_URL is missing from the deployment environment variables.";\n  if (e?.code === "28P01" || e?.code === "3D000" || e?.code === "08001" || e?.code === "08006") return "The database connection failed. Check DATABASE_URL and database access settings in the deployment.";\n  console.error("products API failure:", e?.code || "no-code", e?.message || e);\n  return "Product operation failed because the server or database rejected the request. Check the deployment logs for the detailed cause.";\n}
module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET","POST","PATCH","DELETE"])) return;
  const user = await requireAdmin(req, res); if (!user) return;
  if (!requireRole(user, ["owner","store_manager"], res)) return;
  try {
    const pool = db();
    if (req.method === "GET") {
      const result = await pool.query("SELECT id,name,description,price_paise,target_server,rank_group,active,sort_order,created_at,updated_at FROM products ORDER BY sort_order,name");
      return send(res, 200, { products: result.rows });
    }
    const body = parseBody(req);
    if (req.method === "DELETE" && String(req.query?.id || "") === "all") { if (user.role !== "owner") return send(res,403,{error:"Only the owner can clear the catalogue"}); const result = await pool.query("UPDATE products SET active=false,updated_at=now() WHERE active=true"); await safeAudit(user,"product.archive_all","product",null,{archived:result.rowCount}); return send(res,200,{ok:true,archived:result.rowCount}); }
    if (req.method === "POST") {
      const { id,name,description="",price_paise,target_server,rank_group,active=true,sort_order=100 } = body;
      if (!validId(id) || typeof name !== "string" || !name.trim() || name.length > 100 || typeof description !== "string" || description.length > 2000 || !Number.isSafeInteger(price_paise) || price_paise < 0 || !["lifesteal","practice"].includes(target_server) || typeof rank_group !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(rank_group)) return send(res,400,{error:"Invalid product fields. Price must be integer paise; target_server must be lifesteal, practice or both."});
      const result = await pool.query("INSERT INTO products(id,name,description,price_paise,target_server,rank_group,active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[id,name.trim(),description,price_paise,target_server,rank_group,Boolean(active),Number.isInteger(sort_order)?sort_order:100]);
      await audit(user,"product.create","product",id,{target_server,price_paise}); return send(res,201,{product:result.rows[0]});
    }
    const id = String(req.query?.id || body.id || "");
    if (!validId(id)) return send(res,400,{error:"A valid product id is required"});
    if (req.method === "DELETE") {
      await pool.query("UPDATE products SET active=false,updated_at=now() WHERE id=$1",[id]);
      await audit(user,"product.archive","product",id); return send(res,200,{ok:true,archived:true});
    }
    const fields = ["name","description","price_paise","target_server","rank_group","active","sort_order"];
    const updates = []; const values = [id];
    for (const field of fields) if (Object.prototype.hasOwnProperty.call(body,field)) {
      const value=body[field];
      if (field==="name" && (typeof value!=="string" || !value.trim() || value.length>100)) return send(res,400,{error:"Invalid name"});
      if (field==="description" && (typeof value!=="string" || value.length>2000)) return send(res,400,{error:"Invalid description"});
      if (field==="price_paise" && (!Number.isSafeInteger(value) || value<0)) return send(res,400,{error:"price_paise must be a non-negative integer"});
      if (field==="target_server" && !["lifesteal","practice"].includes(value)) return send(res,400,{error:"Invalid target server"});
      if (field==="rank_group" && (typeof value!=="string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(value))) return send(res,400,{error:"Invalid rank group"});
      if (field==="active" && typeof value!=="boolean") return send(res,400,{error:"active must be boolean"});
      if (field==="sort_order" && !Number.isInteger(value)) return send(res,400,{error:"sort_order must be an integer"});
      values.push(field==="name"?value.trim():value); updates.push(field+"=$"+values.length);
    }
    if (!updates.length) return send(res,400,{error:"No editable fields provided"});
    updates.push("updated_at=now()");
    const result=await pool.query("UPDATE products SET "+updates.join(",")+" WHERE id=$1 RETURNING *",values);
    if (!result.rowCount) return send(res,404,{error:"Product not found"});
    await audit(user,"product.update","product",id,{fields:fields.filter(f=>Object.prototype.hasOwnProperty.call(body,f))});
    return send(res,200,{product:result.rows[0]});
  } catch(e) { return send(res,500,{error:friendlyDatabaseError(e)}); }
};
