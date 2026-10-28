const {db,send,method}=require("../lib/server");
const defaults=require("../lib/default-products");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const pool=db();
  for(const p of defaults) await pool.query(
   "INSERT INTO products(id,name,description,price_paise,target_server,rank_group,active,sort_order) VALUES($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT(id) DO NOTHING",
   [p.id,p.name,p.description,p.price_paise,p.target_server,p.rank_group,p.sort_order]
  );
  const result=await pool.query("SELECT id,name,description,price_paise,target_server,rank_group,sort_order FROM products WHERE active=true ORDER BY sort_order,name");
  return send(res,200,{currency:"INR",products:result.rows});
 }catch(e){console.error("public products",e.message);return send(res,503,{error:"Store catalogue temporarily unavailable"});}
};
