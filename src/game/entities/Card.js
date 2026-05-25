export class Card {
  constructor({ id, type, element, wordEN, wordPT, cefrLevel, damage, effect }) {
    this.id = id
    this.type = type
    this.element = element
    this.wordEN = wordEN
    this.wordPT = wordPT
    this.cefrLevel = cefrLevel
    this.damage = damage
    this.effect = effect
  }
}
