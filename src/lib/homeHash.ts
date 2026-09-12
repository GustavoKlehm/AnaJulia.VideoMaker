const HOME_SECTION_IDS = new Set(['marca', 'historias', 'sobre', 'contato'])

export function hashTargetId(hash: string): string | null {
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  if (!id || !HOME_SECTION_IDS.has(id)) {
    return null
  }
  return id
}
