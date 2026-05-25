import { Creature } from './Creature.js'

export class CreatureFactory {
  constructor(creaturesData) {
    this._index = new Map(creaturesData.map(d => [d.id, d]))
  }

  create(id) {
    const data = this._index.get(id)
    if (!data) throw new Error(`Creature not found: ${id}`)
    return new Creature(data)
  }
}
