const cache = new Map()

export async function geocode(locationStr) {
  if (!locationStr?.trim()) return null
  const key = locationStr.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key)

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en-US,en' },
    })
    if (!res.ok) return null
    const results = await res.json()
    if (results?.[0]) {
      const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
      cache.set(key, coords)
      return coords
    }
  } catch {}
  return null
}
