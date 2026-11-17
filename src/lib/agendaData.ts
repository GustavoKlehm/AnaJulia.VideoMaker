import { getSupabase } from './supabase'
import { nameFromEmail, pickColor, type AgendaEvent, type AgendaMember, type AgendaTipo, type EventInput } from './agenda'

/** Leitura e escrita da agenda direto no Supabase; a RLS garante que cada um mexe só no que é seu. */

type EventRow = {
  id: string
  owner_id: string
  tipo: AgendaTipo
  titulo: string
  inicio: string
  fim: string
  dia_todo: boolean
  local: string
  client_id: string | null
  notas: string
}

const EVENT_COLUMNS = 'id, owner_id, tipo, titulo, inicio, fim, dia_todo, local, client_id, notas'

function fromRow(row: EventRow): AgendaEvent {
  return {
    id: row.id,
    ownerId: row.owner_id,
    tipo: row.tipo,
    titulo: row.titulo,
    inicio: row.inicio,
    fim: row.fim,
    diaTodo: row.dia_todo,
    local: row.local,
    clientId: row.client_id,
    notas: row.notas,
  }
}

function toRow(input: EventInput) {
  return {
    tipo: input.tipo,
    titulo: input.titulo,
    inicio: input.inicio,
    fim: input.fim,
    dia_todo: input.diaTodo,
    local: input.local,
    client_id: input.clientId,
    notas: input.notas,
  }
}

function fail(error: { message: string } | null, message: string): void {
  if (error) throw new Error(message)
}

/** Eventos que tocam o intervalo [from, to). */
export async function listEvents(from: string, to: string): Promise<AgendaEvent[]> {
  const { data, error } = await getSupabase()
    .from('agenda_events')
    .select(EVENT_COLUMNS)
    .lt('inicio', to)
    .gt('fim', from)
    .order('inicio')
  fail(error, 'Não deu para abrir a agenda.')
  return (data as EventRow[]).map(fromRow)
}

export async function createEvent(input: EventInput): Promise<AgendaEvent> {
  const { data, error } = await getSupabase().from('agenda_events').insert(toRow(input)).select(EVENT_COLUMNS).single()
  fail(error, 'Não deu para salvar o evento.')
  return fromRow(data as EventRow)
}

export async function updateEvent(id: string, input: EventInput): Promise<AgendaEvent> {
  const { data, error } = await getSupabase()
    .from('agenda_events')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .single()
  fail(error, 'Não deu para salvar. Só quem criou o evento pode mudar.')
  return fromRow(data as EventRow)
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from('agenda_events').delete().eq('id', id)
  fail(error, 'Não deu para apagar o evento.')
}

type ProfileRow = { user_id: string; nome: string; cor: string }

export async function listMembers(): Promise<AgendaMember[]> {
  const { data, error } = await getSupabase().from('studio_profiles').select('user_id, nome, cor').order('nome')
  fail(error, 'Não deu para carregar a equipe da agenda.')
  return (data as ProfileRow[]).map((r) => ({ userId: r.user_id, nome: r.nome, cor: r.cor }))
}

/** Na primeira visita, cria o perfil da pessoa com um nome tirado do e-mail e uma cor livre. */
export async function ensureOwnProfile(userId: string, email: string, members: AgendaMember[]): Promise<AgendaMember[]> {
  if (members.some((m) => m.userId === userId)) return members
  const profile = {
    user_id: userId,
    nome: nameFromEmail(email),
    cor: pickColor(members.map((m) => m.cor)),
  }
  const { error } = await getSupabase().from('studio_profiles').upsert(profile, { onConflict: 'user_id', ignoreDuplicates: true })
  fail(error, 'Não deu para criar o seu perfil na agenda.')
  return listMembers()
}

export async function saveOwnProfile(userId: string, nome: string, cor: string): Promise<void> {
  const { error } = await getSupabase()
    .from('studio_profiles')
    .update({ nome, cor, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  fail(error, 'Não deu para salvar o seu perfil.')
}

export type AgendaClient = { id: string; nome: string }

export async function listAgendaClients(): Promise<AgendaClient[]> {
  const { data, error } = await getSupabase().from('portal_clients').select('id, nome').eq('ativo', true).order('nome')
  fail(error, 'Não deu para carregar os clientes.')
  return data as AgendaClient[]
}
