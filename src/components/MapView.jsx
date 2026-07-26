import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const BRANCH_COLORS = [
  '#4A90E2', '#E67E22', '#2ECC71', '#9B59B6',
  '#E74C3C', '#1ABC9C', '#F39C12', '#e84393',
]

function getBranchColor(people, rootId, personId) {
  if (personId === rootId) return BRANCH_COLORS[0]

  function findBranchIdx(currentId, depth, branchIdx) {
    if (currentId === personId) return branchIdx
    const person = people[currentId]
    if (!person) return -1
    for (let i = 0; i < (person.children || []).length; i++) {
      const result = findBranchIdx(
        person.children[i],
        depth + 1,
        depth === 0 ? i : branchIdx,
      )
      if (result !== -1) return result
    }
    return -1
  }

  const idx = findBranchIdx(rootId, 0, 0)
  return idx >= 0 ? BRANCH_COLORS[idx % BRANCH_COLORS.length] : BRANCH_COLORS[0]
}

export default function MapView({ data, photos, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, {
      center: [20, 10],
      zoom: 2,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const located = Object.values(data.people).filter((p) => p.lat && p.lng)

    located.forEach((person) => {
      const color = getBranchColor(data.people, data.rootId, person.id)
      const photo = person.photoId ? photos[person.photoId] : null
      const initials = `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase()

      const inner = photo
        ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
        : `<span style="color:white;font-weight:700;font-size:16px;font-family:system-ui">${initials}</span>`

      const iconHtml = `
        <div style="
          width:48px;height:48px;border-radius:50%;
          background:${photo ? '#1e2130' : color};
          border:3px solid ${color};
          display:flex;align-items:center;justify-content:center;
          overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.4);
          cursor:pointer;
        ">${inner}</div>`

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28],
      })

      const popup = L.popup({ maxWidth: 200 }).setContent(`
        <div style="text-align:center;padding:4px 8px">
          <strong style="display:block;margin-bottom:2px">${person.firstName} ${person.lastName}</strong>
          ${person.location ? `<span style="font-size:12px;color:#666">📍 ${person.location}</span><br/>` : ''}
          ${person.occupation ? `<span style="font-size:12px;color:#666">💼 ${person.occupation}</span>` : ''}
        </div>
      `)

      const marker = L.marker([person.lat, person.lng], { icon })
        .bindPopup(popup)
        .addTo(mapRef.current)
        .on('click', () => onSelect(person.id))

      markersRef.current.push(marker)
    })

    if (located.length > 0) {
      const bounds = L.latLngBounds(located.map((p) => [p.lat, p.lng]))
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 })
    }
  }, [data, photos])

  const located = Object.values(data.people).filter((p) => p.lat && p.lng).length
  const total = Object.values(data.people).length
  const missing = total - located

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {missing > 0 && (
        <div className="map-hint">
          {missing} {missing === 1 ? 'person has' : 'people have'} no location — add one in their profile
        </div>
      )}
    </div>
  )
}
