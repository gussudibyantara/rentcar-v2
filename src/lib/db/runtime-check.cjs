/** Startup/health check: the HTTP runtime must not bypass tenant RLS. */
async function assertRuntimeDatabase(pool){
 const schema=await pool.query('SELECT version FROM travelos_schema_migrations WHERE version=2');if(!schema.rows.length)throw Error('Jalankan migrasi database versi 2.');
 const result=await pool.query(`SELECT r.rolsuper,r.rolbypassrls,
 EXISTS(SELECT 1 FROM pg_class c WHERE c.oid IN ('public.travelos_workspaces'::regclass,'public.travelos_imports'::regclass) AND pg_has_role(current_user,c.relowner,'USAGE')) AS owns_tenant_tables,
 NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid IN ('public.travelos_workspaces'::regclass,'public.travelos_imports'::regclass) AND NOT c.relrowsecurity) AS rls_enabled
 FROM pg_roles r WHERE r.rolname=current_user`);
 const role=result.rows[0];if(!role||role.rolsuper||role.rolbypassrls||role.owns_tenant_tables||!role.rls_enabled)throw Error('Runtime wajib memakai role non-owner, NOSUPERUSER, NOBYPASSRLS dengan RLS aktif.');
}
module.exports={assertRuntimeDatabase};
