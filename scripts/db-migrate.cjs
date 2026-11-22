if(!process.env.DATABASE_URL){const {loadEnvConfig}=require('@next/env');loadEnvConfig(process.cwd());}
const {getPool}=require('../src/lib/db/connection.cjs');const {migrateDatabase}=require('../src/lib/db/storage.cjs');
(async()=>{const pool=getPool();try{await migrateDatabase(pool);console.log('Skema PostgreSQL siap (v2).');}finally{await pool.end();}})().catch(()=>{console.error('Migrasi gagal. Periksa koneksi, hak DDL database, dan database/schema.sql.');process.exitCode=1;});
