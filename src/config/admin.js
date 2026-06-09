// El email del super-admin. Tiene que coincidir EXACTO con el del owner
// de la cuenta en Supabase Auth, y con el hardcoded en
// supabase/migrations/super_admin_policy.sql.

export const SUPER_ADMIN_EMAIL = 'jcamilouya@gmail.com'

export function isSuperAdmin(session) {
  return session?.user?.email === SUPER_ADMIN_EMAIL
}
