import { useEffect, useRef, useState } from 'react'
import './RowActionsMenu.css'

const MENU_WIDTH = 200
const MENU_HEIGHT = 160

function RowActionsMenu({ open, position, onClose, items }) {
  const ref = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !position) return

    const margin = 8
    const maxLeft = window.innerWidth - MENU_WIDTH - margin
    const maxTop = window.innerHeight - MENU_HEIGHT - margin

    setCoords({
      top: Math.min(position.y + 4, maxTop),
      left: Math.min(position.x, maxLeft),
    })
  }, [open, position])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose?.()
      }
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="row-actions-menu"
      style={{ top: coords.top, left: coords.left }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`row-actions-menu__item${
            item.variant ? ` row-actions-menu__item--${item.variant}` : ''
          }`}
          onClick={() => {
            onClose?.()
            item.onClick?.()
          }}
        >
          {item.icon && (
            <span className="row-actions-menu__icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export default RowActionsMenu
