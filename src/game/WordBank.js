import cardsData from '../data/cards.json'
import { Card } from './entities/Card.js'

// Cria instâncias de Card a partir do JSON
const allCards = cardsData.map(d => new Card(d))

/**
 * Retorna todas as cartas filtradas por nível CEFR.
 * @param {string} cefrLevel — ex.: 'A1', 'A2', 'B1'
 * @returns {Card[]}
 */
export function getByLevel(cefrLevel) {
  return allCards.filter(c => c.cefrLevel === cefrLevel)
}

/**
 * Embaralha um array no lugar usando Fisher-Yates.
 * @param {any[]} arr
 * @returns {any[]} o mesmo array embaralhado
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Retorna `count` strings PT-BR para usar como opções de defesa.
 * Sempre inclui a tradução correta da carta; as demais são decoys aleatórios.
 *
 * @param {Card} correctCard — carta sendo atacada
 * @param {number} count — total de opções (padrão 3)
 * @returns {string[]} traduções embaralhadas, length === count
 */
export function getRandomOptions(correctCard, count = 3) {
  const correct = correctCard.wordPT

  // Candidatos ao decoy: mesmo nível, excluindo a carta correta
  const sameLevel = allCards.filter(
    c => c.cefrLevel === correctCard.cefrLevel && c.wordPT !== correct
  )

  // Se não houver candidatos suficientes no mesmo nível, completa com outros
  const otherLevel = allCards.filter(
    c => c.cefrLevel !== correctCard.cefrLevel && c.wordPT !== correct
  )

  // Pool único de wordPT (sem duplicatas)
  const seen = new Set()
  const decoyPool = []
  for (const c of [...sameLevel, ...otherLevel]) {
    if (!seen.has(c.wordPT)) {
      seen.add(c.wordPT)
      decoyPool.push(c.wordPT)
    }
  }

  // Embaralha o pool e pega (count - 1) decoys
  shuffle(decoyPool)
  const decoys = decoyPool.slice(0, count - 1)

  // Monta array final com a opção correta e embaralha
  const options = [correct, ...decoys]
  shuffle(options)

  return options
}
