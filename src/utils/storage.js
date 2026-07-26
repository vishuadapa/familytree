const STORAGE_KEY = 'familytree_v1'

function makeInitialData() {
  const rootId = crypto.randomUUID()
  return {
    rootId,
    people: {
      [rootId]: {
        id: rootId,
        firstName: 'You',
        lastName: '',
        location: '',
        lat: null,
        lng: null,
        occupation: '',
        phone: '',
        photoId: null,
        parentId: null,
        children: [],
      },
    },
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return makeInitialData()
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function addPerson(data, parentId, personData) {
  const id = crypto.randomUUID()
  const newPeople = { ...data.people }
  newPeople[id] = { id, parentId: parentId || null, children: [], ...personData }
  if (parentId && newPeople[parentId]) {
    newPeople[parentId] = {
      ...newPeople[parentId],
      children: [...newPeople[parentId].children, id],
    }
  }
  return { data: { ...data, people: newPeople }, id }
}

export function updatePerson(data, id, updates) {
  return {
    ...data,
    people: {
      ...data.people,
      [id]: { ...data.people[id], ...updates },
    },
  }
}

export function deletePerson(data, id) {
  const newPeople = { ...data.people }

  function removeSubtree(pid) {
    const p = newPeople[pid]
    if (!p) return
    ;(p.children || []).forEach(removeSubtree)
    delete newPeople[pid]
  }

  const person = newPeople[id]
  if (!person) return data

  removeSubtree(id)

  if (person.parentId && newPeople[person.parentId]) {
    newPeople[person.parentId] = {
      ...newPeople[person.parentId],
      children: newPeople[person.parentId].children.filter((c) => c !== id),
    }
  }

  return { ...data, people: newPeople }
}
