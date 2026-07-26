import { openDB } from 'idb'

const DB_NAME = 'familytree_photos'
const STORE = 'photos'
const DB_VERSION = 1

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    },
  })
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = 240
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const min = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - min) / 2
      const sy = (img.naturalHeight - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export async function savePhoto(file) {
  const dataUrl = await compressImage(file)
  if (!dataUrl) return null
  const id = crypto.randomUUID()
  const db = await getDB()
  await db.put(STORE, dataUrl, id)
  return { id, dataUrl }
}

export async function savePhotoById(id, dataUrl) {
  const db = await getDB()
  await db.put(STORE, dataUrl, id)
}

export async function getPhoto(id) {
  if (!id) return null
  try {
    const db = await getDB()
    return db.get(STORE, id)
  } catch {
    return null
  }
}

export async function deletePhoto(id) {
  if (!id) return
  try {
    const db = await getDB()
    await db.delete(STORE, id)
  } catch {}
}

export async function getAllPhotos(ids) {
  const db = await getDB()
  const entries = await Promise.all(
    ids.map(async (id) => [id, await db.get(STORE, id)])
  )
  return Object.fromEntries(entries.filter(([, v]) => v))
}
