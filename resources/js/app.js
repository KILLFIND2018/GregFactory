import { createApp } from 'vue'
import Inventory from './components/Inventory.vue'

// Создаем Vue приложение
const inventoryApp = createApp(Inventory)

// Создаем контейнер
const container = document.createElement('div')
container.id = 'vue-inventory'
document.body.appendChild(container)

// Монтируем
const vm = inventoryApp.mount('#vue-inventory')

// Экспортируем глобально для доступа из game.js
window.VueInventory = vm

console.log('🎮 Vue Inventory загружен')

// Дополнительно: можно добавить CSS для body чтобы не было отступов
const style = document.createElement('style')
style.textContent = `
  body { margin: 0; padding: 0; overflow: hidden; }
  #vue-inventory { position: fixed; top: 0; left: 0; z-index: 10000; }
`
document.head.appendChild(style)
