"use strict";
const {db,send,method,requireAdmin,requireRole,audit}=require("../../lib/server");

const statements = [
  `CREATE TABLE IF NOT EXISTS staff_users (email text PRIMARY KEY,password_hash text NOT NULL,role text NOT NULL CHECK(role IN ('store_manager','support')),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS login_attempts (attempt_key text PRIMARY KEY,count integer NOT NULL DEFAULT 0,first_attempt timestamptz NOT NULL DEFAULT now(),locked_until timestamptz)`,
  `CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY,name text NOT NULL,description text NOT NULL DEFAULT '',price_paise integer NOT NULL DEFAULT 0 CHECK(price_paise >= 0),target_server text NOT NULL DEFAULT 'lifesteal' CHECK(target_server IN ('lifesteal','practice','both')),rank_group text NOT NULL DEFAULT 'DEFAULT',active boolean NOT NULL DEFAULT true,sort_order integer NOT NULL DEFAULT 100,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),minecraft_username varchar(16) NOT NULL,target_server text NOT NULL CHECK(target_server IN ('lifesteal','practice')),items jsonb NOT NULL DEFAULT '[]'::jsonb,amount_paise integer NOT NULL CHECK(amount_paise >= 0),currency char(3) NOT NULL DEFAULT 'INR',status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled','refunded')),payment_provider text,provider_order_id text UNIQUE,provider_payment_id text UNIQUE,payment_verified_at timestamptz,delivery_status text NOT NULL DEFAULT 'not_ready' CHECK(delivery_status IN ('not_ready','queued','delivered','failed')),delivery_id text UNIQUE,support_notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS announcements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,body text NOT NULL,active boolean NOT NULL DEFAULT true,starts_at timestamptz,ends_at timestamptz,created_by text NOT NULL DEFAULT 'owner',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id bigserial PRIMARY KEY,actor_email text NOT NULL,action text NOT NULL,entity_type text NOT NULL,entity_id text,details jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS site_settings (setting_key text PRIMARY KEY,setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,updated_by text NOT NULL DEFAULT 'owner',updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS network_status (status_key text PRIMARY KEY,status_value jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS game_modes (id text PRIMARY KEY,name text NOT NULL,description text NOT NULL DEFAULT '',server_address text NOT NULL DEFAULT '',version text NOT NULL DEFAULT '1.21.x',status text NOT NULL DEFAULT 'online' CHECK(status IN ('online','maintenance','offline')),active boolean NOT NULL DEFAULT true,sort_order integer NOT NULL DEFAULT 100,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT ''`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS target_server text NOT NULL DEFAULT 'lifesteal'`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS rank_group text NOT NULL DEFAULT 'DEFAULT'`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS updated_by text NOT NULL DEFAULT 'owner'`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
  `CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status,delivery_status)`,
  `CREATE INDEX IF NOT EXISTS products_active_sort_idx ON products(active,sort_order)`,
  `CREATE INDEX IF NOT EXISTS announcements_public_idx ON announcements(active,starts_at,ends_at)`,
  `CREATE INDEX IF NOT EXISTS game_modes_active_sort_idx ON game_modes(active,sort_order,name)`
];

module.exports=async function handler(req,res){
 if(!method(req,res,["POST"]))return;
 const user=await requireAdmin(req,res);if(!user)return;
 if(!requireRole(user,["owner"],res))return;
 try{
  const pool=db();
  await pool.query("BEGIN");
  try{for(const sql of statements)await pool.query(sql);await pool.query("COMMIT")}
  catch(e){await pool.query("ROLLBACK");throw e}
  try{await audit(user,"database.schema.repair","database","schema",{statements:statements.length})}catch(e){console.error("schema repair audit failed",e.message)}
  const names=["products","orders","announcements","staff_users","audit_logs","site_settings","game_modes","login_attempts"];
  const result=await pool.query("SELECT name,to_regclass('public.'||name) IS NOT NULL AS present FROM unnest($1::text[]) AS name",[names]);
  const missing=result.rows.filter(r=>!r.present).map(r=>r.name);
  if(missing.length)return send(res,500,{error:"Schema repair ran but these tables are still missing: "+missing.join(", ")});
  return send(res,200,{ok:true,message:"Database schema checked and missing tables/columns were repaired. Existing records were not intentionally deleted.",tables:names.length});
 }catch(e){
  console.error("database schema repair failed",e?.code||"no-code",e?.message||e);
  if(!process.env.DATABASE_URL)return send(res,500,{error:"DATABASE_URL is missing from deployment environment variables. Add it before database repair."});
  if(e?.code==="28P01"||e?.code==="3D000"||e?.code==="08001"||e?.code==="08006")return send(res,500,{error:"Cannot connect to the database. Check DATABASE_URL and database access settings."});
  return send(res,500,{error:"Database repair failed"+(e?.code?" (code "+e.code+")":"")+". Check deployment logs and database permissions; no success was reported."});
 }
};
