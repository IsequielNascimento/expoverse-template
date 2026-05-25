import * as THREE from 'three'
import { gameStore } from './store/gameStore.js'
import MenuScene from '../scenes/MenuScene.js'
import ArenaScene from '../scenes/ArenaScene.js'
import ResultScene from '../scenes/ResultScene.js'

const container = document.getElementById('canvas-container')

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
container.appendChild(renderer.domElement)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  if (currentScene?.camera) {
    currentScene.camera.aspect = window.innerWidth / window.innerHeight
    currentScene.camera.updateProjectionMatrix()
  }
})

const scenes = { menu: MenuScene, arena: ArenaScene, result: ResultScene }

let currentScene = null
let currentSceneName = null

function switchScene(name) {
  if (currentScene?.cleanup) currentScene.cleanup()
  currentScene = scenes[name]
  currentSceneName = name
  currentScene.init(renderer, gameStore)
}

const clock = new THREE.Clock()

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta()
  currentScene?.update(delta)
  if (currentScene?.scene && currentScene?.camera) {
    renderer.render(currentScene.scene, currentScene.camera)
  }
})

gameStore.subscribe((state) => {
  if (state.scene !== currentSceneName) {
    switchScene(state.scene)
  }
})

switchScene('menu')
