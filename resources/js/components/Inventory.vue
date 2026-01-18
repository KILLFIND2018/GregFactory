<template>
  <div
      v-if="isVisible"
      class="inventory-wrapper"
      :class="{ 'compact-mode': isCompact }"
      @click.stop
  >
    <!-- Основной инвентарь -->
    <div class="inventory-main">
      <!-- Заголовок -->
      <div class="inventory-header">
        <div class="header-title">
          <span class="title-icon">🎒</span>
          Инвентарь
          <span v-if="playerName" class="player-name">• {{ playerName }}</span>
        </div>
        <div class="header-controls">
          <button
              class="btn-control"
              :title="isCompact ? 'Развернуть' : 'Свернуть'"
              @click="toggleCompact"
          >
            {{ isCompact ? '↗' : '↙' }}
          </button>
          <button
              class="btn-control"
              title="Обновить"
              @click="refresh"
              :disabled="isLoading"
          >
            <span class="refresh-icon" :class="{ 'spinning': isLoading }">↻</span>
          </button>
          <button
              class="btn-control btn-close"
              title="Закрыть (Tab)"
              @click="hide"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Быстрые инструменты -->
      <div v-if="!isCompact" class="quick-tools">
        <div class="section-title">
          <span class="section-icon">🛠️</span>
          Инструменты
        </div>
        <div class="tools-grid">
          <div
              v-for="tool in sortedTools"
              :key="tool.id"
              class="tool-item"
              :class="{
              'active': activeToolId === tool.id,
              'broken': tool.durability <= 0
            }"
              @click="switchTool(tool.id)"
              :title="getToolTooltip(tool)"
          >
            <div class="tool-icon">
              {{ getToolEmoji(tool.id) }}
            </div>
            <div class="tool-info">
              <div class="tool-name">{{ tool.name }}</div>
              <div v-if="tool.durability !== Infinity" class="tool-durability">
                <div class="durability-bar">
                  <div
                      class="durability-fill"
                      :style="{ width: `${(tool.durability / tool.maxDurability) * 100}%` }"
                      :class="getDurabilityClass(tool)"
                  ></div>
                </div>
                <span class="durability-text">
                  {{ tool.durability }}/{{ tool.maxDurability }}
                </span>
              </div>
            </div>
            <div v-if="tool.hotkey" class="tool-hotkey">
              {{ tool.hotkey }}
            </div>
          </div>
        </div>
      </div>

      <!-- Ресурсы -->
      <div v-if="!isCompact" class="resources-section">
        <div class="section-header">
          <div class="section-title">
            <span class="section-icon">📦</span>
            Ресурсы ({{ filteredResources.length }})
          </div>
          <div class="section-controls">
            <div class="search-box">
              <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Поиск..."
                  class="search-input"
                  @keyup.esc="searchQuery = ''"
              />
              <span class="search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div class="resources-grid">
          <div
              v-for="item in filteredResources"
              :key="item.id"
              class="resource-item"
              :class="{ 'selected': selectedItemId === item.id }"
              @click="selectItem(item)"
              @dblclick="useItem(item)"
              :title="getItemTooltip(item)"
          >
            <div class="resource-icon" :style="getItemStyle(item)">
              <span v-if="item.count > 1" class="stack-count">
                {{ formatCount(item.count) }}
              </span>
              <span v-if="item.isPersistent" class="persistent-badge" title="Персистентный">∞</span>
            </div>
            <div class="resource-info">
              <div class="resource-name">{{ item.name }}</div>
              <div class="resource-meta">
                <span class="resource-type">{{ item.type }}</span>
                <span class="resource-count">{{ item.count }} шт</span>
              </div>
            </div>
            <div v-if="item.maxStack > 1" class="stack-bar">
              <div
                  class="stack-fill"
                  :style="{ width: `${(item.count / item.maxStack) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Пустой инвентарь -->
        <div v-if="filteredResources.length === 0" class="empty-inventory">
          <div class="empty-icon">📭</div>
          <div class="empty-text">
            {{ searchQuery ? 'Ничего не найдено' : 'Инвентарь пуст' }}
          </div>
          <button
              v-if="searchQuery"
              class="btn-clear-search"
              @click="searchQuery = ''"
          >
            Очистить поиск
          </button>
        </div>
      </div>
    </div>

    <!-- Уведомления -->
    <div class="notifications">
      <transition-group name="notification">
        <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification"
            :class="`notification-${notification.type}`"
            @click="removeNotification(notification.id)"
        >
          <span class="notification-icon">{{ getNotificationIcon(notification.type) }}</span>
          <span class="notification-text">{{ notification.message }}</span>
          <button class="notification-close">×</button>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// ========== СОСТОЯНИЕ ==========
const isVisible = ref(false)
const isCompact = ref(false)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedItemId = ref(null)
const notifications = ref([])

// Данные инвентаря
const playerId = ref(null)
const playerName = ref('')
const blocks = ref({})
const tools = ref({})
const activeToolId = ref('hand')

// Конфигурация
const TOOL_CONFIG = {
  hand: { name: 'Рука', emoji: '✊', hotkey: '1', maxDurability: Infinity },
  axe: { name: 'Топор', emoji: '🪓', hotkey: '2', maxDurability: 60 },
  shovel: { name: 'Лопата', emoji: '🪣', hotkey: '3', maxDurability: 60 },
  pickaxe: { name: 'Кирка', emoji: '⛏️', hotkey: '4', maxDurability: 60 }
}

const RESOURCE_CONFIG = {
  stone: { name: 'Камень', type: 'Блок', color: '#808080', persistent: true },
  dirt: { name: 'Земля', type: 'Блок', color: '#8B7355' },
  sand: { name: 'Песок', type: 'Блок', color: '#d2b48c' },
  gravel: { name: 'Гравий', type: 'Блок', color: '#8d8d8d' },
  grass: { name: 'Трава', type: 'Блок', color: '#567d46' },
  wood: { name: 'Дерево', type: 'Блок', color: '#8B4513' },
  // ... добавьте остальные ресурсы из game.js
}

// ========== ВЫЧИСЛЯЕМЫЕ СВОЙСТВА ==========
const sortedTools = computed(() => {
  return Object.entries(tools.value)
      .map(([id, data]) => ({
        id,
        name: TOOL_CONFIG[id]?.name || id,
        durability: data.durability || TOOL_CONFIG[id]?.maxDurability || Infinity,
        maxDurability: TOOL_CONFIG[id]?.maxDurability || Infinity,
        hotkey: TOOL_CONFIG[id]?.hotkey
      }))
      .sort((a, b) => (a.hotkey || '').localeCompare(b.hotkey || ''))
})

const resourcesList = computed(() => {
  return Object.entries(blocks.value)
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => {
        const config = RESOURCE_CONFIG[id] || {
          name: formatName(id),
          type: 'Ресурс',
          color: '#888888'
        }
        const maxStack = config.persistent ? 1 : 64

        return {
          id,
          name: config.name,
          type: config.type,
          count,
          color: config.color,
          maxStack,
          isPersistent: config.persistent || false,
          isStackFull: count >= maxStack
        }
      })
})

const filteredResources = computed(() => {
  if (!searchQuery.value) return resourcesList.value

  const query = searchQuery.value.toLowerCase()
  return resourcesList.value.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
  )
})

// ========== МЕТОДЫ ==========
const formatName = (id) => {
  return id
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
}

const formatCount = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

const getToolEmoji = (toolId) => {
  return TOOL_CONFIG[toolId]?.emoji || '🛠️'
}

const getToolTooltip = (tool) => {
  if (tool.durability === Infinity) {
    return `${tool.name}\nБесконечная прочность`
  }
  return `${tool.name}\nПрочность: ${tool.durability}/${tool.maxDurability}`
}

const getItemTooltip = (item) => {
  return `${item.name}\nТип: ${item.type}\nКоличество: ${item.count}`
}

const getItemStyle = (item) => {
  return {
    backgroundColor: item.color
  }
}

const getDurabilityClass = (tool) => {
  const percent = (tool.durability / tool.maxDurability) * 100
  if (percent > 70) return 'high'
  if (percent > 30) return 'medium'
  return 'low'
}

const getNotificationIcon = (type) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type] || '📢'
}

// ========== ДЕЙСТВИЯ ==========
const show = () => {
  isVisible.value = true
  refresh()
}

const hide = () => {
  isVisible.value = false
  selectedItemId.value = null
}

const toggleCompact = () => {
  isCompact.value = !isCompact.value
}

const refresh = async () => {
  if (!playerId.value || isLoading.value) return

  isLoading.value = true

  try {
    const response = await fetch(`/api/inventory?player_id=${playerId.value}`)
    const data = await response.json()

    if (data.success) {
      blocks.value = data.inventory?.blocks || {}
      tools.value = data.inventory?.tools || {}
      activeToolId.value = data.inventory?.current_tool || 'hand'
    }
  } catch (error) {
    console.error('Ошибка загрузки инвентаря:', error)
    addNotification('Ошибка загрузки инвентаря', 'error')
  } finally {
    isLoading.value = false
  }
}

const switchTool = async (toolId) => {
  if (!playerId.value) return

  // Обновляем локально
  activeToolId.value = toolId

  // Обновляем в игре
  if (window.gameInventory?.switchTool) {
    window.gameInventory.switchTool(toolId)
  }

  // Отправляем на сервер
  try {
    await fetch('/api/inventory/set-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId.value,
        tool_id: toolId
      })
    })

    addNotification(`Инструмент: ${TOOL_CONFIG[toolId]?.name || toolId}`, 'info')
  } catch (error) {
    console.error('Ошибка смены инструмента:', error)
  }
}

const selectItem = (item) => {
  selectedItemId.value = selectedItemId.value === item.id ? null : item.id
}

const useItem = (item) => {
  console.log('Использовать:', item)
  addNotification(`Используется: ${item.name}`, 'info')
}

const addNotification = (message, type = 'info') => {
  const id = Date.now() + Math.random()
  notifications.value.push({ id, message, type })

  // Автоудаление через 3 секунды
  setTimeout(() => {
    removeNotification(id)
  }, 3000)
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.value.splice(index, 1)
  }
}

// ========== ЖИЗНЕННЫЙ ЦИКЛ ==========
onMounted(() => {
  // Глобальные события
  window.addEventListener('inventory-update', handleInventoryUpdate)
  window.addEventListener('toggle-inventory', toggleInventory)
  window.addEventListener('player-spawned', handlePlayerSpawned)

  // Горячие клавиши
  window.addEventListener('keydown', handleKeydown)

  // Периодическое обновление
  const interval = setInterval(() => {
    if (isVisible.value && playerId.value) {
      refresh()
    }
  }, 10000)

  // Сохраняем для очистки
  window.inventoryInterval = interval
})

onUnmounted(() => {
  window.removeEventListener('inventory-update', handleInventoryUpdate)
  window.removeEventListener('toggle-inventory', toggleInventory)
  window.removeEventListener('player-spawned', handlePlayerSpawned)
  window.removeEventListener('keydown', handleKeydown)

  if (window.inventoryInterval) {
    clearInterval(window.inventoryInterval)
  }
})

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

const handleInventoryUpdate = (event) => {
  console.log('Vue: Получено обновление инвентаря:', event.detail);
  if (event.detail) {
    if (event.detail.blocks) {
      console.log('Vue: Блоки до:', blocks.value);
      blocks.value = event.detail.blocks;
      console.log('Vue: Блоки после:', blocks.value);
    }
    if (event.detail.blocks) blocks.value = event.detail.blocks
    if (event.detail.tools) tools.value = event.detail.tools
    if (event.detail.currentTool) activeToolId.value = event.detail.currentTool
  }
}

const toggleInventory = () => {
  if (isVisible.value) {
    hide()
  } else {
    show()
  }
}

const handlePlayerSpawned = (event) => {
  playerId.value = event.detail?.id || window.playerId
  playerName.value = event.detail?.name || 'Игрок'
  refresh()
}

const handleKeydown = (event) => {
  // Tab для открытия/закрытия
  if (event.key === 'Tab') {
    event.preventDefault()
    toggleInventory()
  }

  // Escape для закрытия
  if (event.key === 'Escape' && isVisible.value) {
    event.preventDefault()
    hide()
  }

  // Быстрое переключение инструментов
  if (event.key === '1') switchTool('hand')
  if (event.key === '2') switchTool('axe')
  if (event.key === '3') switchTool('shovel')
  if (event.key === '4') switchTool('pickaxe')
}

// Экспортируем методы для доступа из game.js
defineExpose({
  show,
  hide,
  refresh,
  addNotification,
  updateData: (data) => {
    if (data.blocks) blocks.value = data.blocks
    if (data.tools) tools.value = data.tools
    if (data.currentTool) activeToolId.value = data.currentTool
  }
})
</script>

<style scoped>
.inventory-wrapper {
  position: fixed;
  top: 50%;
  left: 20%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 12px;
  border: 2px solid #FFD700;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  min-width: 300px;
  font-family: 'Arial', sans-serif;
}

.compact-mode {
  width: 350px;
}

.inventory-main {
  padding: 20px;
}

/* Заголовок */
.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
}

.header-title {
  color: #FFD700;
  font-size: 20px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 24px;
}

.player-name {
  color: #4FC3F7;
  font-size: 14px;
  font-weight: normal;
}

.header-controls {
  display: flex;
  gap: 8px;
}

.btn-control {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-control:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.btn-close:hover {
  background: rgba(244, 67, 54, 0.2);
  border-color: #F44336;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Инструменты */
.quick-tools {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  color: #4FC3F7;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.tool-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.tool-item.active {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
}

.tool-item.broken {
  opacity: 0.5;
  filter: grayscale(1);
}

.tool-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}

.tool-info {
  flex: 1;
}

.tool-name {
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.tool-durability {
  display: flex;
  align-items: center;
  gap: 8px;
}

.durability-bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.durability-fill {
  height: 100%;
  transition: width 0.3s;
}

.durability-fill.high { background: #4CAF50; }
.durability-fill.medium { background: #FF9800; }
.durability-fill.low { background: #F44336; }

.durability-text {
  font-size: 11px;
  color: #aaa;
  min-width: 45px;
}

.tool-hotkey {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #FFD700;
  font-size: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ресурсы */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-controls {
  display: flex;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 8px 16px 8px 32px;
  color: white;
  font-size: 14px;
  width: 200px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4FC3F7;
  width: 250px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 14px;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

/* Стили скроллбара */
.resources-grid::-webkit-scrollbar {
  width: 6px;
}

.resources-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.resources-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.3);
  border-radius: 3px;
}

.resources-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.5);
}

.resource-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  position: relative;
}

.resource-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.resource-item.selected {
  border-color: #4FC3F7;
  background: rgba(79, 195, 247, 0.1);
}

.resource-icon {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  margin: 0 auto 8px;
  position: relative;
  background-size: cover;
  background-position: center;
}

.stack-count {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 12px;
  font-weight: bold;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.persistent-badge {
  position: absolute;
  top: -6px;
  left: -6px;
  background: #FFD700;
  color: #000;
  font-size: 10px;
  font-weight: bold;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resource-info {
  text-align: center;
}

.resource-name {
  color: white;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #aaa;
}

.resource-type, .resource-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.stack-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.stack-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s;
}

/* Пустой инвентарь */
.empty-inventory {
  text-align: center;
  padding: 40px 20px;
  color: #888;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 20px;
}

.btn-clear-search {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-clear-search:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Уведомления */
.notifications {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10001;
}

.notification {
  background: rgba(0, 0, 0, 0.9);
  border-left: 4px solid;
  border-radius: 6px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 250px;
  max-width: 350px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-success {
  border-color: #4CAF50;
}

.notification-error {
  border-color: #F44336;
}

.notification-warning {
  border-color: #FF9800;
}

.notification-info {
  border-color: #2196F3;
}

.notification-icon {
  font-size: 16px;
}

.notification-text {
  flex: 1;
  color: white;
  font-size: 14px;
}

.notification-close {
  background: none;
  border: none;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.notification-leave-active {
  transition: all 0.3s;
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
