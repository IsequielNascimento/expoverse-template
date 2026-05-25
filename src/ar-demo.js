import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'
import ARDemoScene from '../scenes/ARDemoScene.js'

import { gameStore } from './store/gameStore.js'
import { MachinePhase } from './game/machine/phases.js'
import { TurnMachine } from './game/machine/TurnMachine.js'
import { EnergyBar } from './ui/EnergyBar.js'
import { DefensePanel } from './ui/DefensePanel.js'
import { BasicAI } from './game/ai/BasicAI.js'
import { CreatureFactory } from './game/entities/CreatureFactory.js'
import creaturesData from './data/creatures.json'
import cardsData from './data/cards.json'

// ─── Three.js / WebXR setup (do not modify) ──────────────────────────────────

const container = document.getElementById('canvas-container')

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.xr.enabled = true
container.appendChild(renderer.domElement)

document.body.appendChild(
  ARButton.createButton(renderer, { optionalFeatures: ['dom-overlay'] })
)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  if (demoScene.camera) {
    demoScene.camera.aspect = window.innerWidth / window.innerHeight
    demoScene.camera.updateProjectionMatrix()
  }
})

const demoScene = ARDemoScene
demoScene.init(renderer)

const clock = new THREE.Clock()

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta()
  demoScene.update(delta)
  renderer.render(demoScene.scene, demoScene.camera)
})

// ─── Game initialization ──────────────────────────────────────────────────────

// Cria criaturas via factory
const creatureFactory = new CreatureFactory(creaturesData)
const playerCreature = creatureFactory.create('pyromante')
const opponentCreature = creatureFactory.create('verdante')

// Inicializa o store com as criaturas
gameStore.setState({ playerCreature, opponentCreature })

// Instancia os sistemas de jogo
const machine = new TurnMachine(gameStore)
const energyBar = new EnergyBar(gameStore)
const defensePanel = new DefensePanel(gameStore, machine)
const ai = new BasicAI(gameStore, machine)

// Monta overlays de UI e inicia IA
energyBar.mount()
defensePanel.mount()
ai.start()

// ─── Hand HUD ─────────────────────────────────────────────────────────────────

// Pega as 3 primeiras cartas de ataque do JSON para a mão do jogador
const handCards = cardsData.filter(c => c.type === 'attack').slice(0, 3)

const cardsHud = document.getElementById('cards-hud')
const conjureBtn = document.getElementById('conjure-btn')

let selectedCard = null
let pendingTimeoutId = null

/**
 * Cria um elemento .card para uma carta de ataque do JSON.
 * @param {object} cardData - dado bruto do cards.json
 * @returns {HTMLElement}
 */
function buildCardElement(cardData) {
  const card = document.createElement('div')
  card.className = 'card'
  card.dataset.cardId = cardData.id

  const icon = document.createElement('div')
  icon.className = `card-icon ${cardData.element}`

  const word = document.createElement('div')
  word.className = 'card-word'
  word.textContent = cardData.wordEN

  const pt = document.createElement('div')
  pt.className = 'card-pt'
  pt.textContent = cardData.wordPT

  const cefr = document.createElement('div')
  cefr.className = 'card-cefr'
  cefr.textContent = `${cardData.cefrLevel} · ⚔ ${cardData.damage}`

  card.appendChild(icon)
  card.appendChild(word)
  card.appendChild(pt)
  card.appendChild(cefr)

  card.addEventListener('click', () => onCardClick(cardData, card))

  return card
}

// Popula o HUD com as cartas da mão
handCards.forEach(cardData => {
  cardsHud.appendChild(buildCardElement(cardData))
})

/**
 * Gerencia o clique em uma carta do HUD.
 * Só age na fase PLAYER_ATTACK com turno do jogador.
 * @param {object} cardData
 * @param {HTMLElement} cardEl
 */
function onCardClick(cardData, cardEl) {
  const { phase, turn } = gameStore.state
  if (phase !== MachinePhase.PLAYER_ATTACK || turn !== 'player') return

  const wasSelected = cardEl.classList.contains('selected')

  // Limpa seleção anterior
  cardsHud.querySelectorAll('.card').forEach(c => c.classList.remove('selected', 'revealed'))

  if (wasSelected) {
    // Segunda vez no mesmo card: deseleciona e esconde botão
    selectedCard = null
    conjureBtn.hidden = true
  } else {
    // Seleciona o novo card
    cardEl.classList.add('selected', 'revealed')
    selectedCard = cardData
    conjureBtn.hidden = false
  }
}

// Botão "Conjurar": lança a magia com a carta selecionada
conjureBtn.addEventListener('click', () => {
  if (!selectedCard) return
  const { phase, turn } = gameStore.state
  if (phase !== MachinePhase.PLAYER_ATTACK || turn !== 'player') return

  const cardToCast = selectedCard
  selectedCard = null

  // Limpa visuais de seleção
  cardsHud.querySelectorAll('.card').forEach(c => c.classList.remove('selected', 'revealed'))
  conjureBtn.hidden = true

  machine.castSpell(cardToCast)
})

// ─── Visibilidade do HUD conforme a fase ─────────────────────────────────────

/**
 * Aplica o estado visual das cartas com base na fase atual.
 * @param {string} phase
 * @param {string} turn
 */
function updateHudVisibility(phase, turn) {
  const isPlayerTurn = phase === MachinePhase.PLAYER_ATTACK && turn === 'player'
  const isBurstDefense = phase === MachinePhase.BURST_DEFENSE

  // Oculta o HUD completamente durante a defesa (para não sobrepor o DefensePanel)
  if (isBurstDefense) {
    cardsHud.style.display = 'none'
    conjureBtn.hidden = true
    return
  }

  cardsHud.style.display = 'flex'

  if (isPlayerTurn) {
    // Cartas clicáveis e visíveis
    cardsHud.style.opacity = '1'
    cardsHud.style.pointerEvents = 'auto'
  } else {
    // Cartas dimmed e não-interativas nas outras fases
    cardsHud.style.opacity = '0.5'
    cardsHud.style.pointerEvents = 'none'
    // Garante que não há seleção visual pendente
    cardsHud.querySelectorAll('.card').forEach(c => c.classList.remove('selected', 'revealed'))
    selectedCard = null
    conjureBtn.hidden = true
  }
}

// ─── Overlay de GAME_OVER ─────────────────────────────────────────────────────

let gameOverShown = false

/**
 * Exibe o overlay de fim de jogo.
 * @param {object} state - estado atual do store
 */
function showGameOver(state) {
  if (gameOverShown) return
  gameOverShown = true

  // Cancela timeouts pendentes para não chamar métodos da máquina após GAME_OVER
  if (pendingTimeoutId !== null) {
    clearTimeout(pendingTimeoutId)
    pendingTimeoutId = null
  }

  const playerDefeated = state.playerCreature?.isDefeated?.()

  const overlay = document.createElement('div')
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(10,18,36,0.92)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:24px',
    'z-index:999',
    'font-family:system-ui,-apple-system,sans-serif',
  ].join(';')

  const title = document.createElement('div')
  title.style.cssText = 'color:#f5e642;font-size:48px;font-weight:900;text-align:center;'
  title.textContent = playerDefeated ? 'Derrota 💀' : 'Vitória! 🏆'

  const subtitle = document.createElement('div')
  subtitle.style.cssText = 'color:#a0c8d0;font-size:18px;text-align:center;'
  subtitle.textContent = playerDefeated
    ? 'Seu mago foi derrotado. Tente novamente!'
    : 'Parabéns! Você dominou o oponente!'

  const restartBtn = document.createElement('button')
  restartBtn.textContent = 'Reiniciar'
  restartBtn.style.cssText = [
    'background:#1B2A4A',
    'border:2px solid #1F6F78',
    'color:#ffffff',
    'font-size:20px',
    'padding:12px 36px',
    'border-radius:10px',
    'cursor:pointer',
    'margin-top:8px',
  ].join(';')
  restartBtn.addEventListener('click', () => window.location.reload())

  overlay.appendChild(title)
  overlay.appendChild(subtitle)
  overlay.appendChild(restartBtn)
  document.body.appendChild(overlay)
}

// ─── Assinatura do store — reage a mudanças de fase ──────────────────────────

gameStore.subscribe((state) => {
  const { phase, turn } = state

  // Atualiza visibilidade do HUD a cada mudança
  updateHudVisibility(phase, turn)

  if (phase === MachinePhase.GAME_OVER) {
    showGameOver(state)
    return
  }

  if (phase === MachinePhase.RESOLVE) {
    // Após 800 ms, avança para SWAP_TURN (ou GAME_OVER se alguém foi derrotado)
    if (pendingTimeoutId !== null) clearTimeout(pendingTimeoutId)
    pendingTimeoutId = setTimeout(() => {
      pendingTimeoutId = null
      if (gameStore.state.phase === MachinePhase.RESOLVE) {
        machine.resolve()
      }
    }, 800)
    return
  }

  if (phase === MachinePhase.SWAP_TURN) {
    // Após 600 ms, avança para PLAYER_ATTACK do próximo turno
    if (pendingTimeoutId !== null) clearTimeout(pendingTimeoutId)
    pendingTimeoutId = setTimeout(() => {
      pendingTimeoutId = null
      if (gameStore.state.phase === MachinePhase.SWAP_TURN) {
        machine.nextAttack()
      }
    }, 600)
    return
  }
})

// ─── Inicia o primeiro turno ──────────────────────────────────────────────────

machine.startTurn()
