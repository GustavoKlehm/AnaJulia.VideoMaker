import type { SupabaseClient } from '@supabase/supabase-js'
import type { MediaAssetRow } from './types'

function throwIfError(error: { message: string } | null, label: string): void {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export async function listMedia(client: SupabaseClient): Promise<MediaAssetRow[]> {
  const { data, error } = await client
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
  throwIfError(error, 'media_assets')
  return (data ?? []) as MediaAssetRow[]
}

export async function uploadMedia(
  client: SupabaseClient,
  file: File,
  folder: 'library' | 'hero' | 'stories',
): Promise<MediaAssetRow> {
  const kind = file.type.startsWith('video') ? 'video' : 'image'
  const safeName = file.name.replace(/[^\w.-]+/g, '-')
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await client.storage.from('media').upload(path, file, {
    upsert: false,
  })
  throwIfError(uploadError, 'storage.upload')

  const { data } = client.storage.from('media').getPublicUrl(path)
  const { data: row, error } = await client
    .from('media_assets')
    .insert({
      bucket: 'media',
      path,
      public_url: data.publicUrl,
      kind,
      alt: '',
      title: file.name,
    })
    .select('*')
    .single()

  throwIfError(error, 'media_assets.insert')
  return row as MediaAssetRow
}

export async function setHeroMedia(client: SupabaseClient, mediaId: number): Promise<void> {
  const { error } = await client
    .from('site_settings')
    .update({ hero_media_id: mediaId, updated_at: new Date().toISOString() })
    .eq('id', 1)
  throwIfError(error, 'site_settings.hero')
}

export async function getHeroMediaId(client: SupabaseClient): Promise<number | null> {
  const { data, error } = await client
    .from('site_settings')
    .select('hero_media_id')
    .eq('id', 1)
    .maybeSingle()
  throwIfError(error, 'site_settings.hero_media_id')
  return (data?.hero_media_id as number | null) ?? null
}

export async function getStoryMediaIds(
  client: SupabaseClient,
): Promise<Record<string, number | null>> {
  const { data, error } = await client.from('stories').select('id, media_id')
  throwIfError(error, 'stories.media')
  const map: Record<string, number | null> = {}
  for (const row of data ?? []) {
    map[row.id as string] = (row.media_id as number | null) ?? null
  }
  return map
}
