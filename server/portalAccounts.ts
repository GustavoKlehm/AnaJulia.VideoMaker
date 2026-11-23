import type { SupabaseClient, User } from '@supabase/supabase-js'
import { loginEmailForPhone } from '../src/shared/phone.js'
import type { ContactInput } from './portalInput.js'
import { generatePin } from './portalInput.js'

const BAN_FOREVER = '876000h'

export type ContactRow = {
  id: string
  client_id: string
  user_id: string
  nome: string
  telefone: string
  ativo: boolean
  created_at: string
}

export type NewAccess = { nome: string; telefone: string; pin: string }

export type EnsureResult = {
  contato: ContactRow
  /** Presente só quando um login novo foi criado (ou recriado). */
  acesso: NewAccess | null
  /** O telefone já tinha login por outro cliente: continua com o mesmo PIN. */
  reaproveitado: boolean
}

async function findAuthUserByEmail(db: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 200) return null
  }
  return null
}

async function setBanned(db: SupabaseClient, userId: string, banned: boolean): Promise<void> {
  const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: banned ? BAN_FOREVER : 'none' })
  if (error) throw error
}

/** Login (usuário do Auth) para um telefone: reaproveita se já existe, senão cria com PIN novo. */
async function ensureLogin(
  db: SupabaseClient,
  contact: ContactInput,
): Promise<{ userId: string; pin: string | null }> {
  const { data: existing, error } = await db
    .from('portal_contacts')
    .select('user_id')
    .eq('telefone', contact.telefone)
    .limit(1)
  if (error) throw error
  if (existing && existing.length > 0) {
    await setBanned(db, existing[0].user_id as string, false)
    return { userId: existing[0].user_id as string, pin: null }
  }

  const email = loginEmailForPhone(contact.telefone)
  const pin = generatePin()
  const { data, error: createError } = await db.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    app_metadata: { portal: 'cliente' },
    user_metadata: { nome: contact.nome, telefone: contact.telefone },
  })
  if (!createError && data.user) {
    return { userId: data.user.id, pin }
  }

  // Login sobrou de um contato apagado: reaproveita e troca o PIN.
  const orphan = await findAuthUserByEmail(db, email)
  if (!orphan) throw createError ?? new Error('Não deu para criar o login.')
  const { error: updateError } = await db.auth.admin.updateUserById(orphan.id, {
    password: pin,
    ban_duration: 'none',
    app_metadata: { ...orphan.app_metadata, portal: 'cliente' },
  })
  if (updateError) throw updateError
  return { userId: orphan.id, pin }
}

export async function ensureContact(db: SupabaseClient, clientId: string, contact: ContactInput): Promise<EnsureResult> {
  const { data: current, error } = await db
    .from('portal_contacts')
    .select('*')
    .eq('client_id', clientId)
    .eq('telefone', contact.telefone)
    .maybeSingle()
  if (error) throw error

  if (current) {
    const { data: updated, error: updateError } = await db
      .from('portal_contacts')
      .update({ nome: contact.nome, ativo: true, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select('*')
      .single()
    if (updateError) throw updateError
    if (!current.ativo) await setBanned(db, current.user_id as string, false)
    return { contato: updated as ContactRow, acesso: null, reaproveitado: false }
  }

  const login = await ensureLogin(db, contact)
  const { data: inserted, error: insertError } = await db
    .from('portal_contacts')
    .insert({ client_id: clientId, user_id: login.userId, nome: contact.nome, telefone: contact.telefone })
    .select('*')
    .single()
  if (insertError) throw insertError

  return {
    contato: inserted as ContactRow,
    acesso: login.pin ? { nome: contact.nome, telefone: contact.telefone, pin: login.pin } : null,
    reaproveitado: login.pin === null,
  }
}

/** Desativa o contato; se a pessoa não tiver mais nenhum cliente ativo, bloqueia o login. */
export async function deactivateContact(db: SupabaseClient, contact: ContactRow): Promise<void> {
  const { error } = await db
    .from('portal_contacts')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', contact.id)
  if (error) throw error

  const { count, error: countError } = await db
    .from('portal_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', contact.user_id)
    .eq('ativo', true)
  if (countError) throw countError
  if (!count) await setBanned(db, contact.user_id, true)
}

export async function resetPin(db: SupabaseClient, contact: ContactRow): Promise<NewAccess> {
  const pin = generatePin()
  const { error } = await db.auth.admin.updateUserById(contact.user_id, { password: pin, ban_duration: 'none' })
  if (error) throw error
  return { nome: contact.nome, telefone: contact.telefone, pin }
}
