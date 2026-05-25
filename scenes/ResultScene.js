import * as THREE from 'three'

const STYLE_ID = 'vb-result-style'

const CSS = `
.vb-result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 18, 36, 0.96);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  z-index: 500;
  font-family: 'Segoe UI', Arial, sans-serif;
  padding: 32px;
}
.vb-result-title {
  color: #f5e642;
  font-size: 52px;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 0 24px rgba(245, 230, 66, 0.5);
}
.vb-result-grimoire {
  background: rgba(31, 111, 120, 0.2);
  border: 1px solid #1F6F78;
  border-radius: 12px;
  padding: 20px 28px;
  min-width: 320px;
  max-width: 480px;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vb-result-grimoire-title {
  color: #4A9FD4;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}
.vb-result-grimoire-empty {
  color: #2E7D5B;
  font-size: 15px;
  font-style: italic;
}
.vb-result-grimoire-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vb-result-grimoire-item {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 15px;
}
.vb-result-en {
  color: #f5e642;
  font-weight: 700;
  min-width: 110px;
}
.vb-result-arrow { color: #4A9FD4; }
.vb-result-pt { color: #e0e0e0; }
.vb-result-btn {
  background: #1B2A4A;
  border: 2px solid #1F6F78;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  padding: 14px 40px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.vb-result-btn:hover {
  background: #1F6F78;
  border-color: #4A9FD4;
}
`

const ResultScene = {
  scene: null,
  camera: null,
  _overlay: null,
  _store: null,

  init(_renderer, store) {
    this._store = store

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1B2A4A)
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 2, 5)
    this.camera.lookAt(0, 0, 0)

    this._buildOverlay(store.state)
  },

  _buildOverlay(state) {
    if (!document.getElementById(STYLE_ID)) {
      const styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      styleEl.textContent = CSS
      document.head.appendChild(styleEl)
    }

    const { playerCreature, grimoire = [] } = state
    const isVictory = playerCreature ? !playerCreature.isDefeated() : false

    const overlay = document.createElement('div')
    overlay.className = 'vb-result-overlay'

    const title = document.createElement('div')
    title.className = 'vb-result-title'
    title.textContent = isVictory ? 'Vitória! 🏆' : 'Derrota 💀'

    const grimoireBox = document.createElement('div')
    grimoireBox.className = 'vb-result-grimoire'

    const grimoireTitle = document.createElement('div')
    grimoireTitle.className = 'vb-result-grimoire-title'
    grimoireTitle.textContent = '📖 Grimório de Erros'
    grimoireBox.appendChild(grimoireTitle)

    if (grimoire.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'vb-result-grimoire-empty'
      empty.textContent = 'Perfeito! Nenhum erro.'
      grimoireBox.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.className = 'vb-result-grimoire-list'
      for (const card of grimoire) {
        const item = document.createElement('div')
        item.className = 'vb-result-grimoire-item'
        const en = document.createElement('span')
        en.className = 'vb-result-en'
        en.textContent = card.wordEN
        const arrow = document.createElement('span')
        arrow.className = 'vb-result-arrow'
        arrow.textContent = '→'
        const pt = document.createElement('span')
        pt.className = 'vb-result-pt'
        pt.textContent = card.wordPT
        item.appendChild(en)
        item.appendChild(arrow)
        item.appendChild(pt)
        list.appendChild(item)
      }
      grimoireBox.appendChild(list)
    }

    const btn = document.createElement('button')
    btn.className = 'vb-result-btn'
    btn.textContent = 'Nova Partida'
    btn.addEventListener('click', () => {
      this._store.setState({
        scene: 'menu',
        phase: 'SETUP',
        playerCreature: null,
        opponentCreature: null,
        cefrLevel: 'A1',
        activeLocation: null,
        currentAttack: null,
        defenseOptions: [],
        grimoire: [],
        turn: 'player',
        lastDamage: 0,
      })
    })

    overlay.appendChild(title)
    overlay.appendChild(grimoireBox)
    overlay.appendChild(btn)
    document.body.appendChild(overlay)
    this._overlay = overlay
  },

  update(_delta) {},

  cleanup() {
    this._overlay?.remove()
    this._overlay = null
    this._store = null
  },
}

export default ResultScene
