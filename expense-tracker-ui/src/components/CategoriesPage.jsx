import { useState } from 'react';
import { api, ApiError } from '../api.js';
import { categoryColor } from '../utils.js';
import Frame from './Frame.jsx';
import { IconCheck, IconEdit, IconPlus, IconTrash, IconX } from './Icons.jsx';

function CategoryCard({ category, onChanged, notify }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const color = categoryColor(category.id);

  async function save() {
    setError('');
    try {
      await api.updateCategory(category.id, name);
      notify('success', 'Category renamed');
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.fieldErrors.name ? err.fieldErrors.name : err.message);
    }
  }

  async function remove() {
    try {
      await api.deleteCategory(category.id);
      notify('success', `Deleted "${category.name}"`);
      onChanged();
    } catch (err) {
      // 409 when expenses still use it: the backend message explains why
      notify('error', err.message);
      setConfirming(false);
    }
  }

  return (
    <div className="cat-card" style={{ '--chip': color }}>
      <div className="cat-swatch" />
      {editing ? (
        <div className="cat-edit">
          <div className={`field field-sm ${error ? 'has-error' : ''}`}>
            <input
              autoFocus
              value={name}
              maxLength={50}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setName(category.name);
                  setError('');
                }
              }}
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="cat-actions">
            <button className="icon-btn" onClick={save} aria-label="Save">
              <IconCheck />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setEditing(false);
                setName(category.name);
                setError('');
              }}
              aria-label="Cancel"
            >
              <IconX />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="cat-info">
            <span className="cat-name">{category.name}</span>
            <span className="cat-id mono">#{category.id}</span>
          </div>
          <div className="cat-actions">
            {confirming ? (
              <>
                <button className="btn btn-danger btn-sm" onClick={remove}>
                  Delete
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </>
            ) : (
              <>
                <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Rename">
                  <IconEdit />
                </button>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => setConfirming(true)}
                  aria-label="Delete"
                >
                  <IconTrash />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CategoriesPage({ categories, onChanged, notify }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function add(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createCategory(name);
      notify('success', `Added "${name.trim()}"`);
      setName('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.fieldErrors.name ? err.fieldErrors.name : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="canvas">
      <div className="canvas-inner">
        <Frame label="New category">
          <form className="add-cat" onSubmit={add} noValidate>
            <div className={`field ${error ? 'has-error' : ''}`}>
              <input
                placeholder="e.g. Health"
                value={name}
                maxLength={50}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
              />
            </div>
            <button className="btn btn-primary" disabled={saving}>
              <IconPlus width={14} height={14} /> Add
            </button>
          </form>
          {error && <p className="field-error add-cat-error">{error}</p>}
        </Frame>

        <Frame label="Categories" meta={`${categories.length} total`}>
          {categories.length === 0 ? (
            <div className="empty">No categories yet.</div>
          ) : (
            <div className="cat-grid">
              {categories.map((c) => (
                <CategoryCard key={`${c.id}-${c.name}`} category={c} onChanged={onChanged} notify={notify} />
              ))}
            </div>
          )}
          <p className="hint">
            Categories used by expenses can't be deleted. Renaming one updates every expense that uses it.
          </p>
        </Frame>
      </div>
    </div>
  );
}
