const {db,send,method}=require("../lib/server");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const pool=db();
  const result=await pool.query("SELECT id,name,description,price_paise,target_server,rank_group,sort_order FROM products WHERE active=true ORDER BY sort_order,name");
  return send(res,200,{currency:"INR",products:result.rows});
 }catch(e){console.error("public products",e.message);return send(res,503,{error:"Store catalogue temporarily unavailable"});}
};
