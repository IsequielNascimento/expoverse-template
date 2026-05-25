import { Card } from './Card.js'

export class CardFactory {
  constructor(cardsData) {
    this._index = new Map(cardsData.map(d => [d.id, d]))
  }

  create(id) {
    const data = this._index.get(id)
    if (!data) throw new Error(`Card not found: ${id}`)
    return new Card(data)
  }

  createMany(ids) {
    return ids.map(id => this.create(id))
  }
}
