import * as THREE from 'three'
import { CreatureFactory } from '../src/game/entities/CreatureFactory.js'
import creaturesData from '../src/data/creatures.json'

const STYLE_ID = 'vb-menu-style'

const CREATURES = [
  { id: 'pyromante',  label: 'Pyromante',  emoji: '🔥', color: '#C0392B' },
  { id: 'verdante',   label: 'Verdante',   emoji: '🌿', color: '#2E7D5B' },
  { id: 'aquariante', label: 'Aquariante', emoji: '💧', color: '#1A6FA8' },
  { id: 'aeromante',  label: 'Aeromante',  emoji: '💨', color: '#7FB3D3' },
]

const CSS = `
.vb-menu-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 200;
  font-family: 'Segoe UI', Arial, sans-serif;
  pointer-events: none;
}
.vb-menu-overlay * { pointer-events: auto; }
.vb-menu-title {
  color: #f5e642;
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 3px;
  text-shadow: 0 0 20px rgba(245, 230, 66, 0.5);
}
.vb-menu-label {
  color: #a0c8d0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.vb-menu-creatures {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.vb-menu-creature-btn {
  width: 96px;
  height: 96px;
  background: rgba(27, 42, 74, 0.85);
  border: 2px solid #4A9FD4;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.vb-menu-creature-btn .vb-menu-emoji { font-size: 28px; }
.vb-menu-creature-btn:hover { transform: translateY(-4px); }
.vb-menu-creature-btn.selected {
  border-color: #2E7D5B;
  box-shadow: 0 0 16px rgba(46, 125, 91, 0.6);
  transform: translateY(-6px);
}
.vb-menu-levels {
  display: flex;
  gap: 10px;
}
.vb-menu-level-btn {
  padding: 8px 20px;
  background: rgba(27, 42, 74, 0.7);
  border: 2px solid #4A9FD4;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.vb-menu-level-btn.selected {
  background: rgba(31, 111, 120, 0.5);
  border-color: #2E7D5B;
  color: #f5e642;
}
.vb-menu-start-btn {
  background: #1F6F78;
  border: 2px solid #4A9FD4;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
  padding: 14px 48px;
  border-radius: 12px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: background 0.15s, transform 0.1s;
}
.vb-menu-start-btn:hover:not(:disabled) {
  background: #2E7D5B;
  transform: scale(1.04);
}
.vb-menu-start-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
`

const MenuScene = {
  scene: null,
  camera: null,
  _cube: null,
  _overlay: null,
  _store: null,
  _selectedCreature: null,
  _selectedLevel: 'A1',

  init(_renderer, store) {
    this._store = store
    this._selectedCreature = null
    this._selectedLevel = 'A1'

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1B2A4A)
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 2, 5)
    this.camera.lookAt(0, 0, 0)

    this._cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshBasicMaterial({ color: 0x4A9FD4 })
    )
    this.scene.add(this._cube)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8))

    this._buildOverlay()
  },

  _buildOverlay() {
    if (!document.getElementById(STYLE_ID)) {
      const styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      styleEl.textContent = CSS
      document.head.appendChild(styleEl)
    }

    const overlay = document.createElement('div')
    overlay.className = 'vb-menu-overlay'

    const title = document.createElement('div')
    title.className = 'vb-menu-title'
    title.textContent = 'VERBOMANTE'

    const creatureLabel = document.createElement('div')
    creatureLabel.className = 'vb-menu-label'
    creatureLabel.textContent = 'Escolha sua criatura'

    const creaturesRow = document.createElement('div')
    creaturesRow.className = 'vb-menu-creatures'

    let selectedBtn = null
    let startBtn

    for (const c of CREATURES) {
      const btn = document.createElement('button')
      btn.className = 'vb-menu-creature-btn'
      btn.innerHTML = `<span class="vb-menu-emoji">${c.emoji}</span><span>${c.label}</span>`
      btn.addEventListener('click', () => {
        selectedBtn?.classList.remove('selected')
        btn.classList.add('selected')
        selectedBtn = btn
        this._selectedCreature = c.id
        startBtn.disabled = false
      })
      creaturesRow.appendChild(btn)
    }

    const levelLabel = document.createElement('div')
    levelLabel.className = 'vb-menu-label'
    levelLabel.textContent = 'Nível de vocabulário'

    const levelsRow = document.createElement('div')
    levelsRow.className = 'vb-menu-levels'

    let selectedLevelBtn = null

    for (const level of ['A1', 'A2', 'B1']) {
      const btn = document.createElement('button')
      btn.className = 'vb-menu-level-btn' + (level === 'A1' ? ' selected' : '')
      btn.textContent = level
      if (level === 'A1') selectedLevelBtn = btn
      btn.addEventListener('click', () => {
        selectedLevelBtn?.classList.remove('selected')
        btn.classList.add('selected')
        selectedLevelBtn = btn
        this._selectedLevel = level
      })
      levelsRow.appendChild(btn)
    }

    startBtn = document.createElement('button')
    startBtn.className = 'vb-menu-start-btn'
    startBtn.textContent = '⚡ INICIAR'
    startBtn.disabled = true
    startBtn.addEventListener('click', () => this._onStart())

    overlay.appendChild(title)
    overlay.appendChild(creatureLabel)
    overlay.appendChild(creaturesRow)
    overlay.appendChild(levelLabel)
    overlay.appendChild(levelsRow)
    overlay.appendChild(startBtn)
    document.body.appendChild(overlay)
    this._overlay = overlay
  },

  _onStart() {
    const factory = new CreatureFactory(creaturesData)
    const playerCreature = factory.create(this._selectedCreature)

    const allIds = CREATURES.map(c => c.id)
    const opponentIds = allIds.filter(id => id !== this._selectedCreature)
    const opponentId = opponentIds[Math.floor(Math.random() * opponentIds.length)]
    const opponentCreature = factory.create(opponentId)

    this._store.setState({
      scene: 'arena',
      phase: 'SETUP',
      playerCreature,
      opponentCreature,
      cefrLevel: this._selectedLevel,
      activeLocation: null,
      currentAttack: null,
      defenseOptions: [],
      grimoire: [],
      turn: 'player',
      lastDamage: 0,
    })
  },

  update(delta) {
    if (this._cube) this._cube.rotation.y += delta * 0.5
  },

  cleanup() {
    this._overlay?.remove()
    this._overlay = null
    this._store = null
    this._selectedCreature = null
    this._cube = null
  },
}

export default MenuScene
