export default function ConfirmModal({ open, onClose, onConfirm, message }) {
  if (!open) return null

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: 10 }}>Confirm</h3>
        <p style={{ color: '#aaa', marginBottom: 20 }}>{message}</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>
            Cancel
          </button>
          <button onClick={onConfirm} style={deleteBtn}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999
}

const modalStyle = {
  background: '#12121f',
  padding: 20,
  borderRadius: 10,
  width: 320
}

const cancelBtn = {
  background: '#444',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  color: '#fff'
}

const deleteBtn = {
  background: '#ff4d4f',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  color: '#fff'
}