import { useState, useEffect } from 'react'
import { loadData, saveData, addPerson, updatePerson, deletePerson } from './utils/storage'
import { getAllPhotos, getPhoto, savePhotoById } from './utils/photoDB'
import TreeView from './components/TreeView'
import MapView from './components/MapView'
import PersonModal from './components/PersonModal'
import BottomNav from './components/BottomNav'

export default function App() {
  const [data, setData] = useState(() => loadData())
  const [view, setView] = useState('tree')
  const [photos, setPhotos] = useState({})
  const [modal, setModal] = useState(null)

  useEffect(() => {
    const ids = Object.values(data.people)
      .filter((p) => p.photoId)
      .map((p) => p.photoId)
    if (ids.length === 0) return
    getAllPhotos(ids).then(setPhotos)
  }, [data])

  function persist(newData) {
    setData(newData)
    saveData(newData)
  }

  function handleSelect(personId) {
    setModal({ personId, parentId: null, initialMode: 'view' })
  }

  function handleAddChild(parentId) {
    setModal({ personId: null, parentId, initialMode: 'add' })
  }

  function handlePhotoUpdate(id, dataUrl) {
    setPhotos((prev) => ({ ...prev, [id]: dataUrl }))
  }

  async function handleSave(personId, parentId, updates, mode) {
    if (mode === 'add') {
      const { data: newData } = addPerson(data, parentId, updates)
      persist(newData)
    } else {
      persist(updatePerson(data, personId, updates))
    }
  }

  function handleDelete(personId) {
    persist(deletePerson(data, personId))
  }

  async function handleExport() {
    const ids = Object.values(data.people)
      .filter((p) => p.photoId)
      .map((p) => p.photoId)
    const photoMap = await getAllPhotos(ids)
    const exportObj = { version: 1, tree: data, photos: photoMap }
    const blob = new Blob([JSON.stringify(exportObj)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed.version !== 1 || !parsed.tree) {
        alert('This file does not look like a valid Family Tree backup.')
        return
      }
      if (!confirm('Import this family tree? Your current tree will be replaced.')) return
      if (parsed.photos) {
        await Promise.all(
          Object.entries(parsed.photos).map(([id, dataUrl]) => savePhotoById(id, dataUrl))
        )
      }
      persist(parsed.tree)
      setPhotos(parsed.photos || {})
    } catch {
      alert('Could not read the file. Make sure it is a valid Family Tree backup.')
    }
  }

  const totalPeople = Object.keys(data.people).length

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-title">🌳 Family Tree</span>
        <div className="header-actions">
          <span className="member-count">{totalPeople} {totalPeople === 1 ? 'member' : 'members'}</span>
          <button className="btn-export" onClick={handleExport} title="Export backup">
            📤 Export
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'tree' && (
          <TreeView
            data={data}
            photos={photos}
            onSelect={handleSelect}
            onAddChild={handleAddChild}
          />
        )}
        {view === 'map' && (
          <MapView
            data={data}
            photos={photos}
            onSelect={handleSelect}
          />
        )}
      </main>

      {modal && (
        <PersonModal
          personId={modal.personId}
          parentId={modal.parentId}
          initialMode={modal.initialMode}
          data={data}
          photos={photos}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onPhotoUpdate={handlePhotoUpdate}
        />
      )}

      <BottomNav view={view} onChange={setView} onImport={handleImport} />
    </div>
  )
}
