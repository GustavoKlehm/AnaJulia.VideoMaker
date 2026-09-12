import type { Request, Response } from 'express'
import { getSupabase } from './supabase'
import {
  mapStudioMember,
  parseCreateUserBody,
  parsePromoteBody,
  readBearerToken,
} from './estudioUsers'

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const token = readBearerToken(req.headers.authorization)
  if (!token) {
    res.status(401).json({ error: 'Entra no estúdio para continuar.' })
    return false
  }

  try {
    const { data, error } = await getSupabase().auth.getUser(token)
    if (error || data.user?.app_metadata?.role !== 'admin') {
      res.status(403).json({ error: 'Essa chave não abre o estúdio.' })
      return false
    }
    return true
  } catch {
    res.status(500).json({ error: 'O estúdio não conseguiu falar com o Auth.' })
    return false
  }
}

export async function listStudioUsers(req: Request, res: Response): Promise<void> {
  if (!(await requireAdmin(req, res))) {
    return
  }

  const { data, error } = await getSupabase().auth.admin.listUsers({ perPage: 100 })
  if (error) {
    res.status(500).json({ error: 'Não deu para listar a equipe.' })
    return
  }

  res.json({
    users: data.users.map((user) => mapStudioMember(user)),
  })
}

export async function createStudioUser(req: Request, res: Response): Promise<void> {
  if (!(await requireAdmin(req, res))) {
    return
  }

  const parsed = parseCreateUserBody(req.body)
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const { data, error } = await getSupabase().auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    app_metadata: parsed.promote ? { role: 'admin' } : {},
  })

  if (error || !data.user) {
    res.status(400).json({
      error: error?.message?.includes('already')
        ? 'Esse e-mail já tem login.'
        : 'Não deu para cadastrar.',
    })
    return
  }

  res.status(201).json({ user: mapStudioMember(data.user) })
}

export async function promoteStudioUser(req: Request, res: Response): Promise<void> {
  if (!(await requireAdmin(req, res))) {
    return
  }

  const parsed = parsePromoteBody(req.body)
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const { data, error } = await getSupabase().auth.admin.listUsers({ perPage: 100 })
  if (error) {
    res.status(500).json({ error: 'Não deu para achar essa pessoa.' })
    return
  }

  const match = data.users.find((user) => user.email?.toLowerCase() === parsed.email)
  if (!match) {
    res.status(404).json({ error: 'Esse e-mail ainda não tem login.' })
    return
  }

  const { data: updated, error: updateError } = await getSupabase().auth.admin.updateUserById(
    match.id,
    {
      app_metadata: { ...match.app_metadata, role: 'admin' },
    },
  )

  if (updateError || !updated.user) {
    res.status(500).json({ error: 'Não deu para promover.' })
    return
  }

  res.json({ user: mapStudioMember(updated.user) })
}
