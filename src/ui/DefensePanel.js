// DefensePanel.js — sobreposição HTML para a fase de defesa (BURST_DEFENSE)
// Exibe a palavra em inglês sendo atacada, três botões PT-BR e uma barra de tempo.
// Não depende de Three.js nem de arquivo CSS externo.

import { getRandomOptions } from '../game/WordBank.js'
import { MachinePhase } from '../game/machine/phases.js'

const STYLE_ID = 'verbomante-defense-panel-style'
const TIMER_SECONDS = 10

const CSS = `
.vb-defense-panel {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(10, 18, 36, 0.92);
  border: 2px solid #1F6F78;
  border-radius: 14px;
  padding: 20px 28px 18px;
  min-width: 320px;
  max-width: 480px;
  font-family: 'Segoe UI', Arial, sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.vb-defense-panel[hidden] {
  display: none;
}

.vb-defense-label {
  color: #a0c8d0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 2px;
}

.vb-defense-word {
  color: #f5e642;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 2px;
  text-shadow: 0 0 18px rgba(245, 230, 66, 0.55);
  text-align: center;
}

.vb-defense-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.vb-defense-btn {
  flex: 1 1 80px;
  min-width: 80px;
  padding: 10px 14px;
  background: rgba(31, 111, 120, 0.35);
  border: 2px solid #1F6F78;
  border-radius: 8px;
  color: #e0f4f6;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  text-align: center;
}

.vb-defense-btn:hover {
  background: rgba(31, 111, 120, 0.7);
  border-color: #4A9FD4;
  transform: translateY(-2px);
}

.vb-defense-btn:active {
  transform: translateY(0);
}

.vb-defense-timer-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.vb-defense-timer-fill {
  height: 100%;
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #f5a623, #f5e642);
  transform-origin: left center;
  transition: none;
}
`

export class DefensePanel {
  /**
   * @param {import('../store/gameStore.js').Store} store
   * @param {{ defend: (isCorrect: boolean) => void }} turnMachine
   */
  constructor(store, turnMachine) {
    this._store = store
    this._turnMachine = turnMachine
    this._unsubscribe = null

    // Timer state
    this._timerId = null
    this._timerStart = null

    // DOM refs — built lazily in mount()
    this._panel = null
    this._wordEl = null
    this._buttonsEl = null
    this._timerFill = null

    // Track whether we are currently showing to avoid redundant resets
    this._isVisible = false
  }

  // ─── Ciclo de vida ──────────────────────────────────────────────────────────

  /** Insere o painel no documento e começa a observar o store. */
  mount() {
    this._ensureStyle()
    this._ensurePanel()

    if (!this._panel.isConnected) {
      document.body.appendChild(this._panel)
    }

    // Inicializa a partir do estado atual
    this._onState(this._store.state)

    // Inscreve no store para atualizações futuras
    this._unsubscribe = this._store.subscribe((state) => this._onState(state))
  }

  /** Remove o painel do documento, para o timer e cancela a inscrição no store. */
  unmount() {
    this._clearTimer()

    if (this._panel && this._panel.isConnected) {
      this._panel.remove()
    }

    if (this._unsubscribe) {
      this._unsubscribe()
      this._unsubscribe = null
    }

    this._isVisible = false
  }

  // ─── Construção de DOM ──────────────────────────────────────────────────────

  _ensureStyle() {
    if (document.getElementById(STYLE_ID)) return

    const styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    styleEl.textContent = CSS
    document.head.appendChild(styleEl)
  }

  _ensurePanel() {
    if (this._panel) return

    // Contêiner principal
    const panel = document.createElement('div')
    panel.className = 'vb-defense-panel'
    panel.hidden = true

    // Rótulo "Defend!"
    const label = document.createElement('div')
    label.className = 'vb-defense-label'
    label.textContent = 'Traduza a palavra!'

    // Palavra em inglês
    const wordEl = document.createElement('div')
    wordEl.className = 'vb-defense-word'

    // Botões de opções PT-BR
    const buttonsEl = document.createElement('div')
    buttonsEl.className = 'vb-defense-buttons'

    // Trilha do timer
    const timerTrack = document.createElement('div')
    timerTrack.className = 'vb-defense-timer-track'

    const timerFill = document.createElement('div')
    timerFill.className = 'vb-defense-timer-fill'
    timerTrack.appendChild(timerFill)

    panel.appendChild(label)
    panel.appendChild(wordEl)
    panel.appendChild(buttonsEl)
    panel.appendChild(timerTrack)

    this._panel = panel
    this._wordEl = wordEl
    this._buttonsEl = buttonsEl
    this._timerFill = timerFill
  }

  // ─── Reatividade ────────────────────────────────────────────────────────────

  /**
   * Chamado sempre que o store emite um novo estado.
   * @param {object} state
   */
  _onState(state) {
    const shouldShow =
      state.phase === MachinePhase.BURST_DEFENSE &&
      state.currentAttack != null

    if (shouldShow) {
      this._show(state.currentAttack)
    } else {
      this._hide()
    }
  }

  // ─── Visibilidade ───────────────────────────────────────────────────────────

  /**
   * Exibe o painel com a palavra e opções geradas para a carta informada.
   * Se já estava visível (re-show por mudança rápida de estado), reinicia.
   * @param {import('../game/entities/Card.js').Card} card
   */
  _show(card) {
    // Para qualquer timer anterior para evitar sobreposição
    this._clearTimer()

    // Popula a palavra
    this._wordEl.textContent = card.wordEN

    // Gera opções de defesa e popula botões
    const options = getRandomOptions(card, 3)
    this._buttonsEl.innerHTML = ''

    for (const opt of options) {
      const btn = document.createElement('button')
      btn.className = 'vb-defense-btn'
      btn.textContent = opt
      btn.addEventListener('click', () => this._onAnswer(opt, card))
      this._buttonsEl.appendChild(btn)
    }

    // Reinicia a barra de tempo
    this._timerFill.style.transform = 'scaleX(1)'

    // Exibe o painel
    this._panel.hidden = false
    this._isVisible = true

    // Inicia contagem regressiva via requestAnimationFrame
    this._startTimer(card)
  }

  /** Esconde o painel e limpa o timer sem chamar turnMachine. */
  _hide() {
    if (!this._isVisible) return

    this._clearTimer()
    this._panel.hidden = true
    this._isVisible = false

    // Reseta a barra visualmente para a próxima exibição
    this._timerFill.style.transform = 'scaleX(1)'
  }

  // ─── Interação ──────────────────────────────────────────────────────────────

  /**
   * Chamado ao clicar em uma opção PT-BR.
   * @param {string} chosen — tradução escolhida pelo usuário
   * @param {import('../game/entities/Card.js').Card} card — carta atual
   */
  _onAnswer(chosen, card) {
    if (!this._isVisible) return  // guard contra cliques tardios

    const isCorrect = chosen === card.wordPT

    // Esconde imediatamente e para o timer
    this._clearTimer()
    this._panel.hidden = true
    this._isVisible = false

    this._turnMachine.defend(isCorrect)
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  /**
   * Inicia o timer animado de TIMER_SECONDS segundos.
   * Usa requestAnimationFrame para a animação da barra e setTimeout para o vencimento.
   * @param {import('../game/entities/Card.js').Card} card
   */
  _startTimer(card) {
    this._timerStart = performance.now()

    // Timeout automático ao fim do prazo
    this._timerId = setTimeout(() => {
      if (!this._isVisible) return

      this._timerFill.style.transform = 'scaleX(0)'
      this._panel.hidden = true
      this._isVisible = false

      this._turnMachine.defend(false)
    }, TIMER_SECONDS * 1000)

    // Loop de animação da barra usando rAF
    const animate = (now) => {
      if (!this._isVisible) return

      const elapsed = now - this._timerStart
      const remaining = Math.max(0, 1 - elapsed / (TIMER_SECONDS * 1000))
      this._timerFill.style.transform = `scaleX(${remaining.toFixed(4)})`

      if (remaining > 0) {
        this._rafId = requestAnimationFrame(animate)
      }
    }

    this._rafId = requestAnimationFrame(animate)
  }

  /** Para e limpa o timer (tanto o timeout quanto o rAF). */
  _clearTimer() {
    if (this._timerId !== null) {
      clearTimeout(this._timerId)
      this._timerId = null
    }

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }

    this._timerStart = null
  }
}
