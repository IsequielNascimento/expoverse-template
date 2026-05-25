import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TurnMachine } from '../src/game/machine/TurnMachine.js'
import { MachinePhase } from '../src/game/machine/phases.js'
import { EnergyBar } from '../src/ui/EnergyBar.js'
import { DefensePanel } from '../src/ui/DefensePanel.js'
import { BasicBot } from '../src/game/ai/BasicAI.js'
import cardsData from '../src/data/cards.json'

const NAVY = new THREE.Color(0x1B2A4A)
const HUD_STYLE_ID = 'vb-arena-hud-style'

const HUD_CSS = `
#vb-cards-hud {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
  z-index: 100;
}
.vb-card {
  width: 88px;
  height: 118px;
  background: rgba(27, 42, 74, 0.92);
  border: 2px solid #4A9FD4;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s, box-shadow 0.15s;
  user-select: none;
  -webkit-user-select: none;
}
.vb-card:hover { transform: translateY(-6px); }
.vb-card.selected {
  transform: translateY(-14px);
  border-color: #2E7D5B;
  box-shadow: 0 0 18px rgba(46, 125, 91, 0.55);
}
.vb-card-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}
.vb-card-icon.fire   { background: radial-gradient(circle, #FF7A3D, #C0392B); }
.vb-card-icon.water  { background: radial-gradient(circle, #5DADE2, #1A6FA8); }
.vb-card-icon.air    { background: radial-gradient(circle, #AED6F1, #7FB3D3); }
.vb-card-icon.nature { background: radial-gradient(circle, #58D68D, #2E7D5B); }
.vb-card-word {
  color: #ffffff;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-align: center;
}
.vb-card-pt {
  color: #4A9FD4;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  min-height: 14px;
  opacity: 0;
  transition: opacity 0.2s;
}
.vb-card.revealed .vb-card-pt { opacity: 1; }
.vb-card-cefr {
  color: rgba(74, 159, 212, 0.65);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
}
#vb-conjure-btn {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: #1B2A4A;
  border: 2px solid #1F6F78;
  color: #ffffff;
  font-size: 18px;
  padding: 10px 28px;
  border-radius: 10px;
  cursor: pointer;
  z-index: 110;
}
`

const ArenaScene = {
  scene: null,
  camera: null,
  _mixer: null,
  _store: null,
  _machine: null,
  _energyBar: null,
  _defensePanel: null,
  _bot: null,
  _unsubscribe: null,
  _pendingTimeoutId: null,
  _selectedCard: null,
  _cardsHud: null,
  _conjureBtn: null,

  init(_renderer, store) {
    this._store = store

    // ── Cena 3D ──────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene()
    this.scene.background = NAVY

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 20)
    this.camera.position.set(0, 2.5, 3.0)
    this.camera.lookAt(0, 0, 0)

    const hemi = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.2)
    hemi.position.set(0, 1, 0)
    this.scene.add(hemi)

    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(1, 3, 2)
    this.scene.add(dir)

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.02, 48),
      new THREE.MeshStandardMaterial({ color: 0x2E7D5B })
    )
    this.scene.add(disc)

    const opponent = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.45, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x1F6F78 })
    )
    opponent.position.set(0, 0.235, -0.5)
    this.scene.add(opponent)

    new GLTFLoader().load('/Player.glb', (gltf) => {
      const model = gltf.scene
      model.position.set(0, 0.01, 0.5)
      model.scale.setScalar(0.18)
      model.rotation.y = Math.PI
      this.scene.add(model)
      if (gltf.animations.length) {
        this._mixer = new THREE.AnimationMixer(model)
        this._mixer.clipAction(gltf.animations[0]).play()
      }
    })

    // ── Sistemas de jogo ─────────────────────────────────────────────────────
    this._machine = new TurnMachine(store)
    this._energyBar = new EnergyBar(store)
    this._defensePanel = new DefensePanel(store, this._machine)
    this._bot = new BasicBot(store, this._machine)

    this._energyBar.mount()
    this._defensePanel.mount()
    this._bot.start()

    // ── HUD de cartas ────────────────────────────────────────────────────────
    this._injectHudStyle()
    this._buildCardsHud(store.state.cefrLevel)

    // ── Assinatura do store ──────────────────────────────────────────────────
    this._unsubscribe = store.subscribe((state) => this._onState(state))

    // ── Inicia o primeiro turno ──────────────────────────────────────────────
    this._machine.startTurn()
  },

  _injectHudStyle() {
    if (!document.getElementById(HUD_STYLE_ID)) {
      const styleEl = document.createElement('style')
      styleEl.id = HUD_STYLE_ID
      styleEl.textContent = HUD_CSS
      document.head.appendChild(styleEl)
    }
  },

  _buildCardsHud(cefrLevel) {
    const attackCards = cardsData.filter(c => c.type === 'attack' && c.cefrLevel === cefrLevel)

    // Embaralha e pega até 3
    for (let i = attackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [attackCards[i], attackCards[j]] = [attackCards[j], attackCards[i]]
    }
    const hand = attackCards.slice(0, 3)

    const hud = document.createElement('div')
    hud.id = 'vb-cards-hud'
    hand.forEach(cardData => hud.appendChild(this._buildCardEl(cardData)))
    document.body.appendChild(hud)
    this._cardsHud = hud

    const conjureBtn = document.createElement('button')
    conjureBtn.id = 'vb-conjure-btn'
    conjureBtn.textContent = '⚡ Conjurar'
    conjureBtn.hidden = true
    conjureBtn.addEventListener('click', () => this._onConjure())
    document.body.appendChild(conjureBtn)
    this._conjureBtn = conjureBtn
  },

  _buildCardEl(cardData) {
    const card = document.createElement('div')
    card.className = 'vb-card'

    const icon = document.createElement('div')
    icon.className = `vb-card-icon ${cardData.element}`

    const word = document.createElement('div')
    word.className = 'vb-card-word'
    word.textContent = cardData.wordEN

    const pt = document.createElement('div')
    pt.className = 'vb-card-pt'
    pt.textContent = cardData.wordPT

    const cefr = document.createElement('div')
    cefr.className = 'vb-card-cefr'
    cefr.textContent = `${cardData.cefrLevel} · ⚔ ${cardData.damage}`

    card.appendChild(icon)
    card.appendChild(word)
    card.appendChild(pt)
    card.appendChild(cefr)
    card.addEventListener('click', () => this._onCardClick(cardData, card))
    return card
  },

  _onCardClick(cardData, cardEl) {
    const { phase, turn } = this._store.state
    if (phase !== MachinePhase.PLAYER_ATTACK || turn !== 'player') return

    const wasSelected = cardEl.classList.contains('selected')
    this._cardsHud.querySelectorAll('.vb-card').forEach(c => c.classList.remove('selected', 'revealed'))

    if (wasSelected) {
      this._selectedCard = null
      this._conjureBtn.hidden = true
    } else {
      cardEl.classList.add('selected', 'revealed')
      this._selectedCard = cardData
      this._conjureBtn.hidden = false
    }
  },

  _onConjure() {
    if (!this._selectedCard) return
    const { phase, turn } = this._store.state
    if (phase !== MachinePhase.PLAYER_ATTACK || turn !== 'player') return

    const card = this._selectedCard
    this._selectedCard = null
    this._cardsHud.querySelectorAll('.vb-card').forEach(c => c.classList.remove('selected', 'revealed'))
    this._conjureBtn.hidden = true
    this._machine.castSpell(card)
  },

  _updateHudVisibility(phase, turn) {
    if (!this._cardsHud) return
    const isBurstDefense = phase === MachinePhase.BURST_DEFENSE
    const isPlayerTurn = phase === MachinePhase.PLAYER_ATTACK && turn === 'player'

    if (isBurstDefense) {
      this._cardsHud.style.display = 'none'
      this._conjureBtn.hidden = true
      return
    }

    this._cardsHud.style.display = 'flex'
    this._cardsHud.style.opacity = isPlayerTurn ? '1' : '0.5'
    this._cardsHud.style.pointerEvents = isPlayerTurn ? 'auto' : 'none'

    if (!isPlayerTurn) {
      this._cardsHud.querySelectorAll('.vb-card').forEach(c => c.classList.remove('selected', 'revealed'))
      this._selectedCard = null
      this._conjureBtn.hidden = true
    }
  },

  _onState(state) {
    const { phase, turn } = state
    this._updateHudVisibility(phase, turn)

    if (phase === MachinePhase.GAME_OVER) {
      if (this._pendingTimeoutId !== null) clearTimeout(this._pendingTimeoutId)
      this._pendingTimeoutId = setTimeout(() => {
        this._pendingTimeoutId = null
        this._store?.setState({ scene: 'result' })
      }, 1200)
      return
    }

    if (phase === MachinePhase.RESOLVE) {
      if (this._pendingTimeoutId !== null) clearTimeout(this._pendingTimeoutId)
      this._pendingTimeoutId = setTimeout(() => {
        this._pendingTimeoutId = null
        if (this._store?.state.phase === MachinePhase.RESOLVE) this._machine.resolve()
      }, 800)
      return
    }

    if (phase === MachinePhase.SWAP_TURN) {
      if (this._pendingTimeoutId !== null) clearTimeout(this._pendingTimeoutId)
      this._pendingTimeoutId = setTimeout(() => {
        this._pendingTimeoutId = null
        if (this._store?.state.phase === MachinePhase.SWAP_TURN) this._machine.nextAttack()
      }, 600)
    }
  },

  update(delta) {
    this._mixer?.update(delta)
  },

  cleanup() {
    if (this._pendingTimeoutId !== null) {
      clearTimeout(this._pendingTimeoutId)
      this._pendingTimeoutId = null
    }
    this._energyBar?.unmount()
    this._defensePanel?.unmount()
    this._bot?.stop()
    if (this._unsubscribe) {
      this._unsubscribe()
      this._unsubscribe = null
    }
    this._cardsHud?.remove()
    this._conjureBtn?.remove()
    this._cardsHud = null
    this._conjureBtn = null
    this._mixer = null
    this._machine = null
    this._energyBar = null
    this._defensePanel = null
    this._bot = null
    this._store = null
    this._selectedCard = null
  },
}

export default ArenaScene
