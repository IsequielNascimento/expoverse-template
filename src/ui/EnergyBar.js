// EnergyBar.js — sobreposição HTML com barras de energia dos dois jogadores
// Renderiza sobre o canvas Three.js sem depender de nenhum arquivo CSS externo.

const STYLE_ID = 'verbomante-energy-bar-style'

const CSS = `
.vb-energy-overlay {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: 'Segoe UI', Arial, sans-serif;
  pointer-events: none;
  user-select: none;
}

.vb-energy-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 8px;
  padding: 6px 10px;
  min-width: 260px;
}

.vb-label {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
  width: 70px;
  flex-shrink: 0;
}

.vb-bar-track {
  flex: 1;
  height: 14px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 7px;
  overflow: hidden;
  position: relative;
}

.vb-bar-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.vb-bar-fill.vb-flash {
  animation: vb-flash-anim 0.4s ease;
}

@keyframes vb-flash-anim {
  0%   { filter: brightness(2.5); }
  100% { filter: brightness(1); }
}

.vb-hp-text {
  color: #e0e0e0;
  font-size: 12px;
  width: 52px;
  text-align: right;
  flex-shrink: 0;
}

.vb-mugic {
  color: #f5c518;
  font-size: 13px;
  letter-spacing: 1px;
  flex-shrink: 0;
}
`

/**
 * Retorna a cor de preenchimento da barra de acordo com a porcentagem de HP.
 * @param {number} pct — valor entre 0 e 1
 * @returns {string} cor CSS
 */
function barColor(pct) {
  if (pct > 0.5) return '#4caf50'   // verde
  if (pct > 0.25) return '#ffc107'  // amarelo
  return '#f44336'                   // vermelho
}

/**
 * Gera string de estrelas para mugicCounters.
 * Exemplo: 3 de 5 → "★★★☆☆"
 * @param {number} current
 * @param {number} max
 * @returns {string}
 */
function mugicStars(current, max) {
  const filled = Math.max(0, Math.min(current, max))
  const empty = max - filled
  return '★'.repeat(filled) + '☆'.repeat(empty)
}

/**
 * Constrói o HTML interno de uma linha de energia.
 * @param {string} label
 * @param {number} energy
 * @param {number} maxEnergy
 * @param {number} mugicCounters
 * @param {number} maxMugic
 * @returns {HTMLElement}
 */
function createRow(label, energy, maxEnergy, mugicCounters, maxMugic) {
  const row = document.createElement('div')
  row.className = 'vb-energy-row'

  const labelEl = document.createElement('span')
  labelEl.className = 'vb-label'
  labelEl.textContent = label

  const track = document.createElement('div')
  track.className = 'vb-bar-track'

  const fill = document.createElement('div')
  fill.className = 'vb-bar-fill'
  const pct = maxEnergy > 0 ? Math.max(0, energy) / maxEnergy : 0
  fill.style.width = `${(pct * 100).toFixed(1)}%`
  fill.style.backgroundColor = barColor(pct)
  track.appendChild(fill)

  const hp = document.createElement('span')
  hp.className = 'vb-hp-text'
  hp.textContent = `${Math.max(0, energy)}/${maxEnergy}`

  const mugic = document.createElement('span')
  mugic.className = 'vb-mugic'
  mugic.textContent = mugicStars(mugicCounters, maxMugic)

  row.appendChild(labelEl)
  row.appendChild(track)
  row.appendChild(hp)
  row.appendChild(mugic)

  return row
}

export class EnergyBar {
  /** @param {import('../store/gameStore.js').Store} store */
  constructor(store) {
    this._store = store
    this._unsubscribe = null

    // Valores anteriores para detectar dano
    this._prevPlayerEnergy = null
    this._prevOpponentEnergy = null

    // Elemento raiz da sobreposição
    this._overlay = document.createElement('div')
    this._overlay.className = 'vb-energy-overlay'

    // Referências às linhas para atualização incremental
    this._playerRow = null
    this._opponentRow = null
    this._playerFill = null
    this._opponentFill = null
    this._playerHp = null
    this._opponentHp = null
    this._playerMugic = null
    this._opponentMugic = null

    this._buildDOM()

    // Inscreve no store para receber atualizações de estado
    this._unsubscribe = store.subscribe((state) => this._onState(state))
  }

  // ─── DOM ────────────────────────────────────────────────────────────────────

  _buildDOM() {
    // Injeta CSS global uma única vez
    if (!document.getElementById(STYLE_ID)) {
      const styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      styleEl.textContent = CSS
      document.head.appendChild(styleEl)
    }

    const state = this._store.state

    const playerCreature = state.playerCreature ?? {}
    const opponentCreature = state.opponentCreature ?? {}

    const playerEnergy = playerCreature.energy ?? 100
    const playerMax = playerCreature.maxEnergy ?? 100
    const playerMugic = playerCreature.mugicCounters ?? 0
    const playerMaxMugic = playerCreature.maxMugicCounters ?? 3

    const opponentEnergy = opponentCreature.energy ?? 100
    const opponentMax = opponentCreature.maxEnergy ?? 100
    const opponentMugic = opponentCreature.mugicCounters ?? 0
    const opponentMaxMugic = opponentCreature.maxMugicCounters ?? 3

    this._prevPlayerEnergy = playerEnergy
    this._prevOpponentEnergy = opponentEnergy

    // Linha do jogador
    const playerRow = createRow('Você', playerEnergy, playerMax, playerMugic, playerMaxMugic)
    this._playerRow = playerRow
    this._playerFill = playerRow.querySelector('.vb-bar-fill')
    this._playerHp = playerRow.querySelector('.vb-hp-text')
    this._playerMugic = playerRow.querySelector('.vb-mugic')

    // Linha do oponente
    const opponentRow = createRow('Oponente', opponentEnergy, opponentMax, opponentMugic, opponentMaxMugic)
    this._opponentRow = opponentRow
    this._opponentFill = opponentRow.querySelector('.vb-bar-fill')
    this._opponentHp = opponentRow.querySelector('.vb-hp-text')
    this._opponentMugic = opponentRow.querySelector('.vb-mugic')

    this._overlay.appendChild(playerRow)
    this._overlay.appendChild(opponentRow)
  }

  // ─── Ciclo de vida ──────────────────────────────────────────────────────────

  /** Insere a sobreposição no documento. */
  mount() {
    if (!this._overlay.isConnected) {
      document.body.appendChild(this._overlay)
    }
  }

  /** Remove a sobreposição do documento e cancela a inscrição no store. */
  unmount() {
    if (this._overlay.isConnected) {
      this._overlay.remove()
    }
    if (this._unsubscribe) {
      this._unsubscribe()
      this._unsubscribe = null
    }
  }

  // ─── Reatividade ────────────────────────────────────────────────────────────

  /**
   * Chamado pelo store após cada setState.
   * Atualiza barras, textos e dispara flash em caso de dano.
   * @param {object} state
   */
  _onState(state) {
    const playerCreature = state.playerCreature ?? {}
    const opponentCreature = state.opponentCreature ?? {}

    const playerEnergy = playerCreature.energy ?? 100
    const playerMax = playerCreature.maxEnergy ?? 100
    const playerMugic = playerCreature.mugicCounters ?? 0
    const playerMaxMugic = playerCreature.maxMugicCounters ?? 3

    const opponentEnergy = opponentCreature.energy ?? 100
    const opponentMax = opponentCreature.maxEnergy ?? 100
    const opponentMugic = opponentCreature.mugicCounters ?? 0
    const opponentMaxMugic = opponentCreature.maxMugicCounters ?? 3

    // Detecta dano pelo campo lastDamage ou por redução direta de energia
    const playerDamaged =
      (state.lastDamage > 0 && state.turn !== 'player') ||
      (this._prevPlayerEnergy !== null && playerEnergy < this._prevPlayerEnergy)

    const opponentDamaged =
      (state.lastDamage > 0 && state.turn === 'player') ||
      (this._prevOpponentEnergy !== null && opponentEnergy < this._prevOpponentEnergy)

    this._prevPlayerEnergy = playerEnergy
    this._prevOpponentEnergy = opponentEnergy

    this._updateBar(
      this._playerFill,
      this._playerHp,
      this._playerMugic,
      playerEnergy,
      playerMax,
      playerMugic,
      playerMaxMugic,
      playerDamaged,
    )

    this._updateBar(
      this._opponentFill,
      this._opponentHp,
      this._opponentMugic,
      opponentEnergy,
      opponentMax,
      opponentMugic,
      opponentMaxMugic,
      opponentDamaged,
    )
  }

  /**
   * Atualiza os elementos visuais de uma barra individual.
   * @param {HTMLElement} fill
   * @param {HTMLElement} hpEl
   * @param {HTMLElement} mugicEl
   * @param {number} energy
   * @param {number} maxEnergy
   * @param {number} mugicCounters
   * @param {number} maxMugic
   * @param {boolean} damaged
   */
  _updateBar(fill, hpEl, mugicEl, energy, maxEnergy, mugicCounters, maxMugic, damaged) {
    const pct = maxEnergy > 0 ? Math.max(0, energy) / maxEnergy : 0
    fill.style.width = `${(pct * 100).toFixed(1)}%`
    fill.style.backgroundColor = barColor(pct)
    hpEl.textContent = `${Math.max(0, energy)}/${maxEnergy}`
    mugicEl.textContent = mugicStars(mugicCounters, maxMugic)

    if (damaged) {
      // Remove a classe antes de reativar para reiniciar a animação
      fill.classList.remove('vb-flash')
      // Força reflow para garantir que a animação recomece
      void fill.offsetWidth
      fill.classList.add('vb-flash')
      setTimeout(() => fill.classList.remove('vb-flash'), 450)
    }
  }
}
