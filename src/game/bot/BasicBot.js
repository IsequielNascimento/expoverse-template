import { MachinePhase } from '../machine/phases.js'
import cardsData from '../../data/cards.json'

// Mapa id → dado de carta para lookup em O(1)
const cardMap = new Map(cardsData.map(card => [card.id, card]))

export class BasicBot {
  /**
   * @param {object} store - gameStore (subscribe / state)
   * @param {object} turnMachine - TurnMachine (castSpell)
   */
  constructor(store, turnMachine) {
    this._store = store
    this._turnMachine = turnMachine
    this._unsubscribe = null
    this._acting = false
  }

  /** Inicia o bot: começa a observar o store */
  start() {
    this._unsubscribe = this._store.subscribe(state => this._onStateChange(state))
  }

  /** Para o bot: cancela a assinatura do store */
  stop() {
    if (this._unsubscribe) {
      this._unsubscribe()
      this._unsubscribe = null
    }
  }

  _onStateChange(state) {
    const { phase, turn, opponentCreature } = state

    // Só age quando for turno do oponente na fase de ataque
    if (phase !== MachinePhase.PLAYER_ATTACK || turn !== 'opponent') {
      // Reseta a guarda ao sair da fase de ataque do oponente
      if (phase !== MachinePhase.PLAYER_ATTACK) {
        this._acting = false
      }
      return
    }

    // Evita chamar castSpell mais de uma vez por fase
    if (this._acting) return
    this._acting = true

    const card = this._pickCard(opponentCreature)
    if (!card) return

    setTimeout(() => {
      this._turnMachine.castSpell(card)
    }, 300)
  }

  /**
   * Escolhe uma carta aleatória do deck do oponente.
   * Prefere cartas de ataque; usa qualquer carta se não houver.
   * @param {object} opponentCreature
   * @returns {object|null} dado bruto da carta do JSON
   */
  _pickCard(opponentCreature) {
    if (!opponentCreature || !opponentCreature.deckIds?.length) return null

    const deckCards = opponentCreature.deckIds
      .map(id => cardMap.get(id))
      .filter(Boolean)

    const attackCards = deckCards.filter(c => c.type === 'attack')
    const pool = attackCards.length > 0 ? attackCards : deckCards

    if (!pool.length) return null

    const index = Math.floor(Math.random() * pool.length)
    return pool[index]
  }
}

export { BasicBot  }
