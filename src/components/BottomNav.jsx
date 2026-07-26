export default function BottomNav({ view, onChange, onImport }) {
  function handleImportClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) onImport(file)
    }
    input.click()
  }

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-btn${view === 'tree' ? ' active' : ''}`}
        onClick={() => onChange('tree')}
      >
        <span className="nav-icon">🌳</span>
        <span className="nav-label">Tree</span>
      </button>
      <button
        className={`nav-btn${view === 'map' ? ' active' : ''}`}
        onClick={() => onChange('map')}
      >
        <span className="nav-icon">🗺️</span>
        <span className="nav-label">Map</span>
      </button>
      <button className="nav-btn" onClick={handleImportClick}>
        <span className="nav-icon">📥</span>
        <span className="nav-label">Import</span>
      </button>
    </nav>
  )
}
