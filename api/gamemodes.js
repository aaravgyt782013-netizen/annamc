"use strict";
const {db,send,method}=require("../lib/server");
module.exports=async function handler(req,res){if(!method(req,res,["GET"]))return;try{const r=await db().query("SELECT id,name,description,server_address,version,status FROM game_modes WHERE active=true ORDER BY sort_order,name");return send(res,200,{gamemodes:r.rows});}catch(e){console.error("public game modes",e.message);return send(res,503,{error:"Game modes unavailable"});}};
