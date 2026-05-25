function createStore(initialState) {
  const listeners = new Set()
  let state = { ...initialState }

  return {
    get state() { return state },
    setState(patch) {
      state = { ...state, ...patch }
      listeners.forEach(fn => fn(state))
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export const gameStore = createStore({
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
