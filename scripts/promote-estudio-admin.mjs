import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2] ?? 'gustavoklehm014@gmail.com'

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

console.log('project', new URL(supabaseUrl).hostname)

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
if (error) {
  throw error
}

const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase())
console.log(
  'users',
  data.users
    .map((item) => `${item.email}:${item.app_metadata?.role === 'admin' ? 'admin' : 'user'}:${item.email_confirmed_at ? 'ok' : 'unconfirmed'}`)
    .join(', ') || '(none)',
)

if (!user) {
  console.log('missing_user', email)
  process.exit(2)
}

if (user.app_metadata?.role === 'admin' && user.email_confirmed_at) {
  console.log('already_admin', email)
  process.exit(0)
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
  app_metadata: { ...user.app_metadata, role: 'admin' },
  email_confirm: true,
})
if (updateError) {
  throw updateError
}

console.log('promoted', email)
