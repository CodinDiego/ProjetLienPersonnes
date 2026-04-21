import { create } from 'zustand'

const STORAGE_KEY = 'flonugast_v1'

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const saveToStorage = (state) => {
  try {
    const toSave = {
      entities: state.entities,
      links: state.links,
      groups: state.groups,
      theme: state.theme,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {}
}

const saved = loadFromStorage()

const useGraphStore = create((set, get) => ({
  // ── Data ──────────────────────────────────────
  entities: saved?.entities || [],
  links: saved?.links || [],
  groups: saved?.groups || [],

  // ── UI state ──────────────────────────────────
  theme: saved?.theme || 'dark',
  selectedIds: [],      // entity ids
  selectedLinkId: null,
  selectedGroupId: null,
  linkingFrom: null,    // entity id when in link mode
  mode: 'select',      // 'select' | 'linking'
  toolbarCollapsed: false,

  // ── Theme ─────────────────────────────────────
  toggleTheme: () => {
    set(s => {
      const theme = s.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', theme)
      const next = { ...s, theme }
      saveToStorage(next)
      return { theme }
    })
  },

  initTheme: () => {
    const theme = get().theme
    document.documentElement.setAttribute('data-theme', theme)
  },

  // ── Toolbar ───────────────────────────────────
  toggleToolbar: () => set(s => ({ toolbarCollapsed: !s.toolbarCollapsed })),

  // ── Entity CRUD ───────────────────────────────
  addEntity: (entity) => {
    const newEntity = {
      id: crypto.randomUUID(),
      name: entity.name,
      shape: entity.shape || 'square',
      color: entity.color || 'cyan',
      x: entity.x !== undefined ? entity.x : (100 + Math.random() * 400),
      y: entity.y !== undefined ? entity.y : (80 + Math.random() * 300),
    }
    set(s => {
      const entities = [...s.entities, newEntity]
      const next = { ...s, entities }
      saveToStorage(next)
      return { entities }
    })
  },

  updateEntity: (id, updates) => {
    set(s => {
      const entities = s.entities.map(e => e.id === id ? { ...e, ...updates } : e)
      const next = { ...s, entities }
      saveToStorage(next)
      return { entities }
    })
  },

  deleteEntity: (id) => {
    set(s => {
      const entities = s.entities.filter(e => e.id !== id)
      const links = s.links.filter(l => l.from !== id && l.to !== id)
      const groups = s.groups.map(g => ({
        ...g,
        entityIds: g.entityIds.filter(eid => eid !== id)
      }))
      const selectedIds = s.selectedIds.filter(sid => sid !== id)
      const next = { ...s, entities, links, groups }
      saveToStorage(next)
      return { entities, links, groups, selectedIds }
    })
  },

  // ── Move entity ───────────────────────────────
  moveEntity: (id, dx, dy) => {
    set(s => {
      const entities = s.entities.map(e =>
        e.id === id ? { ...e, x: e.x + dx, y: e.y + dy } : e
      )
      const next = { ...s, entities }
      saveToStorage(next)
      return { entities }
    })
  },

  // ── Link CRUD ─────────────────────────────────
  addLink: (link) => {
    const newLink = {
      id: crypto.randomUUID(),
      from: link.from,
      to: link.to,
      type: link.type || 'arrow',   // 'none' | 'arrow' | 'bidirectional'
      label: link.label || '',
    }
    set(s => {
      const links = [...s.links, newLink]
      const next = { ...s, links }
      saveToStorage(next)
      return { links }
    })
  },

  deleteLink: (id) => {
    set(s => {
      const links = s.links.filter(l => l.id !== id)
      const next = { ...s, links }
      saveToStorage(next)
      return { links, selectedLinkId: null }
    })
  },

  // ── Group CRUD ────────────────────────────────
  addGroup: (group) => {
    const newGroup = {
      id: crypto.randomUUID(),
      name: group.name,
      entityIds: group.entityIds || [],
      color: group.color || 'blue',
    }
    set(s => {
      const groups = [...s.groups, newGroup]
      const next = { ...s, groups }
      saveToStorage(next)
      return { groups }
    })
  },

  updateGroup: (id, updates) => {
    set(s => {
      const groups = s.groups.map(g => g.id === id ? { ...g, ...updates } : g)
      const next = { ...s, groups }
      saveToStorage(next)
      return { groups }
    })
  },

  deleteGroup: (id) => {
    set(s => {
      const groups = s.groups.filter(g => g.id !== id)
      const next = { ...s, groups }
      saveToStorage(next)
      return { groups, selectedGroupId: null }
    })
  },

  // ── Selection ─────────────────────────────────
  selectEntity: (id, multi = false) => {
    set(s => {
      if (multi) {
        const already = s.selectedIds.includes(id)
        return {
          selectedIds: already
            ? s.selectedIds.filter(i => i !== id)
            : [...s.selectedIds, id],
          selectedLinkId: null,
          selectedGroupId: null,
        }
      }
      return {
        selectedIds: [id],
        selectedLinkId: null,
        selectedGroupId: null,
      }
    })
  },

  selectLink: (id) => set({ selectedLinkId: id, selectedIds: [], selectedGroupId: null }),
  selectGroup: (id) => set({ selectedGroupId: id, selectedIds: [], selectedLinkId: null }),
  clearSelection: () => set({ selectedIds: [], selectedLinkId: null, selectedGroupId: null }),

  // ── Linking mode ──────────────────────────────
  startLinking: (fromId) => set({ mode: 'linking', linkingFrom: fromId }),
  cancelLinking: () => set({ mode: 'select', linkingFrom: null }),

  // ── Export / Reset ────────────────────────────
  exportJSON: () => {
    const { entities, links, groups } = get()
    const blob = new Blob([JSON.stringify({ entities, links, groups }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flonugast_export.json'
    a.click()
    URL.revokeObjectURL(url)
  },

  importJSON: (data) => {
    try {
      const { entities, links, groups } = data
      set(s => {
        const next = { ...s, entities: entities || [], links: links || [], groups: groups || [] }
        saveToStorage(next)
        return { entities: entities || [], links: links || [], groups: groups || [] }
      })
    } catch {}
  },

  clearAll: () => {
    set(s => {
      const next = { ...s, entities: [], links: [], groups: [] }
      saveToStorage(next)
      return { entities: [], links: [], groups: [], selectedIds: [], selectedLinkId: null, selectedGroupId: null }
    })
  },
}))

export default useGraphStore
