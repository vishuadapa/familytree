import { useState, useEffect, useRef } from 'react'
import { savePhoto, deletePhoto } from '../utils/photoDB'
import { geocode } from '../utils/geocode'

export default function PersonModal({
  personId,
  parentId,
  initialMode,
  data,
  photos,
  onClose,
  onSave,
  onDelete,
  onPhotoUpdate,
}) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    location: '',
    occupation: '',
    phone: '',
    photoId: null,
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const fileRef = useRef()

  const person = personId ? data.people[personId] : null
  const isAdding = initialMode === 'add'
  const isEditing = mode === 'edit' || isAdding

  useEffect(() => {
    if (person) {
      setForm({
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        location: person.location || '',
        occupation: person.occupation || '',
        phone: person.phone || '',
        photoId: person.photoId || null,
      })
      if (person.photoId && photos[person.photoId]) {
        setPhotoPreview(photos[person.photoId])
      }
    }
  }, [personId])

  function handleField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPhotoFile(file)
    setRemovePhoto(false)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleRemovePhoto() {
    setPendingPhotoFile(null)
    setPhotoPreview(null)
    setRemovePhoto(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      let photoId = form.photoId

      if (removePhoto && photoId) {
        await deletePhoto(photoId)
        photoId = null
      } else if (pendingPhotoFile) {
        if (photoId) await deletePhoto(photoId)
        const result = await savePhoto(pendingPhotoFile)
        if (result) {
          photoId = result.id
          onPhotoUpdate(result.id, result.dataUrl)
        }
      }

      const updates = { ...form, photoId }

      if (updates.location && updates.location !== person?.location) {
        setGeocoding(true)
        const coords = await geocode(updates.location)
        setGeocoding(false)
        if (coords) {
          updates.lat = coords.lat
          updates.lng = coords.lng
        } else {
          updates.lat = null
          updates.lng = null
        }
      } else if (!updates.location) {
        updates.lat = null
        updates.lng = null
      }

      await onSave(personId, parentId, updates, initialMode)
      onClose()
    } finally {
      setSaving(false)
      setGeocoding(false)
    }
  }

  async function handleDelete() {
    const hasChildren = person?.children?.length > 0
    const msg = hasChildren
      ? `Delete ${form.firstName || 'this person'} and all their descendants? This cannot be undone.`
      : `Delete ${form.firstName || 'this person'}?`
    if (!confirm(msg)) return
    if (form.photoId) await deletePhoto(form.photoId)
    onDelete(personId)
    onClose()
  }

  const displayName = `${form.firstName} ${form.lastName}`.trim() || 'Unnamed'
  const isRoot = personId === data.rootId

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-drag-handle" />

        <div className="modal-photo-section">
          <div
            className="modal-avatar"
            style={{ backgroundImage: photoPreview ? `url(${photoPreview})` : 'none' }}
            onClick={isEditing ? () => fileRef.current?.click() : undefined}
          >
            {!photoPreview && (
              <span className="avatar-initials">
                {(form.firstName?.[0] || '') + (form.lastName?.[0] || '') || '?'}
              </span>
            )}
            {isEditing && (
              <div className="avatar-camera-overlay">📷</div>
            )}
          </div>

          {isEditing && (
            <div className="photo-actions">
              <button className="btn-photo-change" onClick={() => fileRef.current?.click()}>
                {photoPreview ? 'Change photo' : 'Add photo'}
              </button>
              {photoPreview && (
                <button className="btn-photo-remove" onClick={handleRemovePhoto}>
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <div className="modal-body">
          {isEditing ? (
            <div className="form-fields">
              <div className="form-row">
                <input
                  className="form-input"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => handleField('firstName', e.target.value)}
                  autoFocus
                />
                <input
                  className="form-input"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => handleField('lastName', e.target.value)}
                />
              </div>
              <input
                className="form-input"
                placeholder="📍 Location  (e.g. Lagos, Nigeria)"
                value={form.location}
                onChange={(e) => handleField('location', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="💼 Occupation / what they do"
                value={form.occupation}
                onChange={(e) => handleField('occupation', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="📞 Phone number"
                value={form.phone}
                type="tel"
                onChange={(e) => handleField('phone', e.target.value)}
              />
            </div>
          ) : (
            <div className="view-fields">
              <h2 className="view-name">{displayName}</h2>
              {form.location && (
                <div className="view-field">
                  <span className="field-icon">📍</span>
                  <span>{form.location}</span>
                </div>
              )}
              {form.occupation && (
                <div className="view-field">
                  <span className="field-icon">💼</span>
                  <span>{form.occupation}</span>
                </div>
              )}
              {form.phone && (
                <div className="view-field">
                  <span className="field-icon">📞</span>
                  <a href={`tel:${form.phone}`} className="phone-link">{form.phone}</a>
                </div>
              )}
              {!form.location && !form.occupation && !form.phone && (
                <p className="no-details">No details yet — tap Edit to add some.</p>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {isEditing ? (
            <>
              <button
                className="btn-cancel"
                onClick={isAdding ? onClose : () => setMode('view')}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {geocoding ? 'Locating…' : saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              {!isRoot && (
                <button className="btn-delete" onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button className="btn-edit" onClick={() => setMode('edit')}>
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
