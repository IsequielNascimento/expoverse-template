import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const NAVY = new THREE.Color(0x1B2A4A)

const ARDemoScene = {
  scene: null,
  camera: null,
  _mixer: null,

  init(renderer) {
    this.scene = new THREE.Scene()
    this.scene.background = NAVY

    // Câmera: isométrica afastada — vê os dois personagens e a arena inteira
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 20)
    this.camera.position.set(0, 2.5, 3.0)
    this.camera.lookAt(0, 0, 0)

    // Luzes
    const hemi = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.2)
    hemi.position.set(0, 1, 0)
    this.scene.add(hemi)

    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(1, 3, 2)
    this.scene.add(dir)

    // Disco da arena (centro da cena)
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.02, 48),
      new THREE.MeshStandardMaterial({ color: 0x2E7D5B })
    )
    this.scene.add(disc)

    // Cubo oponente — fundo da arena
    const opponent = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.45, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x1F6F78 })
    )
    opponent.position.set(0, 0.235, -0.5)
    this.scene.add(opponent)

    // Player.glb — primeiro plano, vira para o oponente
    new GLTFLoader().load('/Player.glb', (gltf) => {
      const model = gltf.scene
      model.position.set(0, 0.01, 0.5)
      model.scale.setScalar(0.18)
      model.rotation.y = Math.PI  // vira para enfrentar o oponente (-Z)
      this.scene.add(model)
      if (gltf.animations.length) {
        this._mixer = new THREE.AnimationMixer(model)
        this._mixer.clipAction(gltf.animations[0]).play()
      }
    })

    // AR: fundo transparente quando sessão XR ativa
    renderer.xr.addEventListener('sessionstart', () => { this.scene.background = null })
    renderer.xr.addEventListener('sessionend',   () => { this.scene.background = NAVY })
  },

  update(delta) {
    this._mixer?.update(delta)
  },
}

export default ARDemoScene
