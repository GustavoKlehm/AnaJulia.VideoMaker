import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { useCms } from '../../content/cmsContext'
import { savePricing } from '../../content/cmsSave'
import type { PricingCatalog } from '../../content/types'
import { getSupabase } from '../../lib/supabase'
import {
  isDirty,
  locate,
  parentOf,
  selectionPath,
  uniqueId,
  type Selection,
} from '../../lib/catalogoEditor'
import { CustomEditor, ListEditor, QuickPrices } from './EstudioCatalogoParts'
import { CatalogDetail, CatalogTree } from './EstudioCatalogoTree'
import './estudio.css'
import './catalogo.css'

type Tab = 'planos' | 'precos' | 'adicionais' | 'pecas' | 'regras' | 'personalizado'

const TABS: { id: Tab; label: string }[] = [
  { id: 'planos', label: 'Planos' },
  { id: 'precos', label: 'Preços rápidos' },
  { id: 'adicionais', label: 'Adicionais' },
  { id: 'pecas', label: 'Peças' },
  { id: 'regras', label: 'Regras' },
  { id: 'personalizado', label: 'Personalizado' },
]

const LEAVE_MESSAGE = 'Tem alterações não publicadas no catálogo. Sair mesmo assim?'

export function EstudioCatalogo() {
  const { pricing, refresh } = useCms()
  const [baseline, setBaseline] = useState<PricingCatalog>(() => structuredClone(pricing))
  const [draft, setDraft] = useState<PricingCatalog>(() => structuredClone(pricing))
  const [tab, setTab] = useState<Tab>('planos')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(pricing.lines.flatMap((line) => line.categories.map((category) => category.id))),
  )
  const [pane, setPane] = useState<'tree' | 'detail'>('tree')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)

  const dirty = useMemo(() => isDirty(draft, baseline), [draft, baseline])

  // Catálogo chegou do CMS depois de abrir a tela: adota, se ninguém mexeu ainda.
  useEffect(() => {
    if (!isDirty(draft, baseline)) {
      setBaseline(structuredClone(pricing))
      setDraft(structuredClone(pricing))
    }
    // Só reage ao catálogo publicado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing])

  const edit = useCallback((change: (next: PricingCatalog) => void) => {
    setSavedAt(null)
    setDraft((current) => {
      const next = structuredClone(current)
      change(next)
      return next
    })
  }, [])

  // O item aberto pode ter sido removido: sobe até achar algo que existe.
  const resolved = useMemo(() => {
    let current: Selection | null = selection ?? (draft.lines[0] ? { kind: 'line', line: draft.lines[0].id } : null)
    while (current) {
      const found = locate(draft, current)
      if (found) {
        return { selection: current, found }
      }
      current = parentOf(current)
    }
    const first = draft.lines[0]
    if (!first) {
      return null
    }
    const fallback: Selection = { kind: 'line', line: first.id }
    const found = locate(draft, fallback)
    return found ? { selection: fallback, found } : null
  }, [draft, selection])

  function select(next: Selection) {
    setSelection(next)
    setPane('detail')
    setExpanded((current) => {
      const ids = selectionPath(next).slice(1, -1)
      if (ids.every((id) => current.has(id))) {
        return current
      }
      return new Set([...current, ...ids])
    })
    // Só rola quando o detalhe ficou fora da tela (ex.: plano longo, ou troca de painel no celular).
    window.requestAnimationFrame(() => {
      const node = detailRef.current
      const top = node?.getBoundingClientRect().top
      if (node && top !== undefined && (top < 0 || top > window.innerHeight * 0.6)) {
        node.scrollIntoView({ block: 'start' })
      }
    })
  }

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = useCallback(async () => {
    if (busy) {
      return
    }
    setBusy(true)
    setError('')
    const snapshot = structuredClone(draft)
    try {
      await savePricing(getSupabase(), snapshot)
      setBaseline(snapshot)
      setSavedAt(new Date())
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para salvar o catálogo.')
    } finally {
      setBusy(false)
    }
  }, [busy, draft, refresh])

  function handleDiscard() {
    if (window.confirm('Descartar tudo o que mudou desde a última publicação?')) {
      setDraft(structuredClone(baseline))
      setError('')
    }
  }

  // Ctrl/Cmd+S publica.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirty) {
          void handleSave()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, handleSave])

  // Avisa antes de perder alterações: fechar a aba ou clicar num link do estúdio.
  useEffect(() => {
    if (!dirty) {
      return
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey) {
        return
      }
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  return (
    <main className="estudio-page cat-page">
      <header className="cat-header">
        <div>
          <p className="estudio-kicker">Catálogo</p>
          <h1>Planos e valores</h1>
        </div>
        <div className="cat-tabs" role="tablist" aria-label="Partes do catálogo">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`cat-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls="cat-panel"
              className={`cat-tab${tab === item.id ? ' is-on' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div id="cat-panel" role="tabpanel" aria-labelledby={`cat-tab-${tab}`} className="cat-panel">
        {tab === 'planos' && resolved ? (
          <div className="cat-editor" data-pane={pane}>
            <CatalogTree
              draft={draft}
              selection={resolved.selection}
              expanded={expanded}
              onSelect={select}
              onToggle={toggle}
            />
            <div className="cat-editor__detail" ref={detailRef}>
              <CatalogDetail
                draft={draft}
                selection={resolved.selection}
                found={resolved.found}
                edit={edit}
                onSelect={select}
                onBack={() => setPane('tree')}
              />
            </div>
          </div>
        ) : null}

        {tab === 'precos' ? (
          <QuickPrices
            draft={draft}
            edit={edit}
            onOpen={(next) => {
              setTab('planos')
              select(next)
            }}
          />
        ) : null}

        {tab === 'adicionais' ? (
          <ListEditor
            compact
            noun="adicional"
            titleKey="label"
            help="Extras cobrados à parte: hora extra, deslocamento, entrega expressa…"
            items={draft.addOns}
            fields={[
              { key: 'label', label: 'Nome' },
              { key: 'value', label: 'Valor (texto livre)' },
            ]}
            onChange={(items) => edit((next) => void (next.addOns = items))}
            create={() => ({ id: uniqueId(draft.addOns.map((item) => item.id), 'adicional'), label: '', value: '' })}
          />
        ) : null}

        {tab === 'pecas' ? (
          <ListEditor
            noun="peça"
            titleKey="name"
            help="O dicionário de formatos (filme, teaser, cortes) que aparece nos planos."
            items={draft.pieces}
            fields={[
              { key: 'name', label: 'Nome' },
              { key: 'purpose', label: 'Função' },
              { key: 'body', label: 'Texto', area: true },
            ]}
            onChange={(items) => edit((next) => void (next.pieces = items))}
            create={() => ({
              id: uniqueId(draft.pieces.map((item) => item.id), 'peca'),
              name: '',
              purpose: '',
              body: '',
            })}
          />
        ) : null}

        {tab === 'regras' ? (
          <ListEditor
            noun="regra"
            titleKey="title"
            help="Condições comerciais: sinal, prazos, remarcação…"
            items={draft.rules}
            fields={[
              { key: 'title', label: 'Título' },
              { key: 'body', label: 'Texto', area: true },
            ]}
            onChange={(items) => edit((next) => void (next.rules = items))}
            create={() => ({ id: uniqueId(draft.rules.map((item) => item.id), 'regra'), title: '', body: '' })}
          />
        ) : null}

        {tab === 'personalizado' ? <CustomEditor draft={draft} edit={edit} /> : null}
      </div>

      <div className={`cat-savebar${dirty ? ' is-dirty' : ''}`} role="region" aria-label="Publicação">
        <p className="cat-savebar__status" aria-live="polite">
          {error ? (
            <span className="cat-savebar__error">
              <WarningCircle size={18} weight="fill" aria-hidden="true" />
              {error}
            </span>
          ) : dirty ? (
            <>
              <i className="cat-dot" aria-hidden="true" />
              Alterações não publicadas
            </>
          ) : savedAt ? (
            <>
              <CheckCircle size={18} weight="fill" className="cat-ok" aria-hidden="true" />
              No ar às {savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </>
          ) : (
            'Tudo publicado'
          )}
        </p>
        <div className="cat-savebar__actions">
          <button className="estudio-button-ghost" type="button" disabled={!dirty || busy} onClick={handleDiscard}>
            Descartar
          </button>
          <button
            className="estudio-button"
            type="button"
            disabled={!dirty || busy}
            onClick={() => void handleSave()}
            title="Ctrl+S"
          >
            {busy ? 'Publicando…' : 'Publicar no site'}
          </button>
        </div>
      </div>
    </main>
  )
}
