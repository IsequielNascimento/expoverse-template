import { MachinePhase } from './phases.js'

export class TurnMachine {
  constructor(store) {
    this._store = store
  }

  get phase() {
    return this._store.state.phase
  }

  startTurn() {
    this._store.setState({
      phase: MachinePhase.PLAYER_ATTACK,
      currentAttack: null,
    })
  }

  castSpell(card) {
    if (this.phase !== MachinePhase.PLAYER_ATTACK) {
      console.warn(`[TurnMachine] castSpell ignorado na fase ${this.phase}`)
      return
    }
    this._store.setState({
      phase: MachinePhase.BURST_DEFENSE,
      currentAttack: card,
    })
  }

  defend(isCorrect) {
    if (this.phase !== MachinePhase.BURST_DEFENSE) {
      console.warn(`[TurnMachine] defend ignorado na fase ${this.phase}`)
      return
    }

    const { turn, playerCreature, opponentCreature, activeLocation, currentAttack, grimoire } = this._store.state

    const defender = turn === 'player' ? opponentCreature : playerCreature
    const defenderKey = turn === 'player' ? 'opponentCreature' : 'playerCreature'

    if (isCorrect) {
      defender.mugicCounters = Math.min(5, defender.mugicCounters + 1)
      this._store.setState({
        phase: MachinePhase.RESOLVE,
        [defenderKey]: defender,
        lastDamage: 0,
      })
    } else {
      const damage = this._calcDamage(currentAttack, activeLocation)
      defender.takeDamage(damage)
      this._store.setState({
        phase: MachinePhase.RESOLVE,
        [defenderKey]: defender,
        grimoire: [...grimoire, currentAttack],
        lastDamage: damage,
      })
    }
  }

  resolve() {
    const { playerCreature, opponentCreature, turn } = this._store.state

    if (playerCreature.isDefeated() || opponentCreature.isDefeated()) {
      this._store.setState({ phase: MachinePhase.GAME_OVER })
      return MachinePhase.GAME_OVER
    }

    const nextTurn = turn === 'player' ? 'opponent' : 'player'
    this._store.setState({
      phase: MachinePhase.SWAP_TURN,
      turn: nextTurn,
    })
    return MachinePhase.SWAP_TURN
  }

  nextAttack() {
    if (this.phase !== MachinePhase.SWAP_TURN) return
    this._store.setState({
      phase: MachinePhase.PLAYER_ATTACK,
      currentAttack: null,
    })
  }

  _calcDamage(card, location) {
    const boost = location?.element === card.element ? 1.25 : 1.0
    return Math.floor(card.damage * boost)
  }
}
