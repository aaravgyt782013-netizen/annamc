const {db,send,method}=require("../lib/server");
module.exports=async function handler(req,res){
 if(!method(req,res,["GET"]))return;
 try{
  const result=await db().query("SELECT id,title,body,starts_at,ends_at FROM announcements WHERE active=true AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) ORDER BY created_at DESC LIMIT 10");
  res.setHeader("Cache-Control","public, s-maxage=60, stale-while-revalidate=120");
  return send(res,200,{announcements:result.rows});
 }catch(e){console.error("public announcements",e.message);return send(res,503,{error:"Announcements temporarily unavailable"});}
};
