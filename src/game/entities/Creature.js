export class Creature {
  constructor({ id, name, tribe, element, maxEnergy, mugicCounters, modelPath, deckIds }) {
    this.id = id
    this.name = name
    this.tribe = tribe
    this.element = element
    this.maxEnergy = maxEnergy
    this.energy = maxEnergy
    this.mugicCounters = mugicCounters
    this.modelPath = modelPath
    this.deckIds = [...deckIds]
  }

  isDefeated() {
    return this.energy <= 0
  }

  takeDamage(amount) {
    this.energy = Math.max(0, this.energy - amount)
  }
}
