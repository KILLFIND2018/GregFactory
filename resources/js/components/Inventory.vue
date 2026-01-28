<template>
    <div class="game-ui" @contextmenu.prevent>
        <transition name="mc-fade">
            <div v-if="isOpen" class="inventory-overlay">
                <div class="mc-window">
                    <div class="mc-title">Инвентарь</div>

                    <!-- Основная сетка инвентаря (9-44 слоты) -->
                    <div class="mc-grid main-grid">
                        <div v-for="slotIdx in mainSlots" :key="slotIdx" class="mc-slot"
                             @dragover.prevent @drop="handleDrop(slotIdx)"
                             @mouseenter="showTooltip($event, getItemAt(slotIdx))" @mouseleave="hideTooltip">

                            <div v-if="getItemAt(slotIdx)" class="item-icon-wrapper" draggable="true"
                                 @dragstart="handleDragStart(slotIdx)">
                                <div class="item-color-block" :style="getItemStyle(getItemAt(slotIdx))">
                                    {{ getItemLabel(getItemAt(slotIdx)) }}
                                </div>
                                <span v-if="getItemAt(slotIdx).quantity > 1" class="item-count">
                                    {{ getItemAt(slotIdx).quantity }}
                                </span>
                                <div v-if="getItemAt(slotIdx).item_type === 'tool'" class="durability-bar">
                                    <div class="durability-fill"
                                         :style="{ width: getDurabilityPercent(getItemAt(slotIdx)) + '%' }"></div>
                                </div>
                            </div>
                            <span v-else class="slot-number">{{ slotIdx }}</span>
                        </div>
                    </div>

                    <!-- Хотбар (0-8 слоты) -->
                    <div class="hotbar-label">Хотбар</div>
                    <div class="mc-grid hotbar-inner-grid">
                        <div v-for="slotIdx in hotbarSlots" :key="slotIdx" class="mc-slot"
                             @dragover.prevent @drop="handleDrop(slotIdx)"
                             @mouseenter="showTooltip($event, getItemAt(slotIdx))" @mouseleave="hideTooltip">

                            <div v-if="getItemAt(slotIdx)" class="item-icon-wrapper" draggable="true"
                                 @dragstart="handleDragStart(slotIdx)">
                                <div class="item-color-block" :style="getItemStyle(getItemAt(slotIdx))">
                                    {{ getItemLabel(getItemAt(slotIdx)) }}
                                </div>
                                <span v-if="getItemAt(slotIdx).quantity > 1" class="item-count">
                                    {{ getItemAt(slotIdx).quantity }}
                                </span>
                                <div v-if="getItemAt(slotIdx).item_type === 'tool'" class="durability-bar">
                                    <div class="durability-fill"
                                         :style="{ width: getDurabilityPercent(getItemAt(slotIdx)) + '%' }"></div>
                                </div>
                            </div>
                            <span v-else class="slot-number">{{ slotIdx + 1 }}</span> <!-- 1-9 вместо 0-8 -->
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Хотбар в HUD -->
        <div class="hud-hotbar-container" v-show="!isOpen">
            <div class="mc-grid hotbar-hud">
                <div v-for="(slotIdx, index) in hotbarSlots" :key="'hud-'+slotIdx"
                     class="mc-slot" :class="{
                 'active-slot': currentHotbarSlot === index,
                 'has-tool': getItemAt(slotIdx) && getItemAt(slotIdx).item_type === 'tool'
             }">
                    <div v-if="getItemAt(slotIdx)" class="item-icon-wrapper">
                        <div class="item-color-block" :style="getItemStyle(getItemAt(slotIdx))">
                            {{ getItemLabel(getItemAt(slotIdx)) }}
                        </div>
                        <span v-if="getItemAt(slotIdx).quantity > 1" class="item-count">
                    {{ getItemAt(slotIdx).quantity }}
                </span>
                        <div v-if="getItemAt(slotIdx).item_type === 'tool'" class="durability-bar">
                            <div class="durability-fill"
                                 :style="{ width: getDurabilityPercent(getItemAt(slotIdx)) + '%' }"></div>
                        </div>
                    </div>
                    <span v-else class="slot-number-hud">{{ index + 1 }}</span>
                </div>
            </div>
        </div>



        <!-- Тултип -->
        <div v-if="tooltip.visible && tooltip.item" class="mc-tooltip"
             :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
            <div class="tooltip-name">{{ getItemDisplayName(tooltip.item) }}</div>
            <div class="tooltip-id">ID: {{ tooltip.item.item_id }}</div>
            <div class="tooltip-type">Тип: {{ getItemTypeName(tooltip.item.item_type) }}</div>
            <div v-if="tooltip.item.quantity > 1" class="tooltip-quantity">
                Количество: {{ tooltip.item.quantity }}
            </div>
            <div v-if="tooltip.item.item_type === 'tool'" class="tooltip-durability">
                Прочность: {{ tooltip.item.durability || 0 }}/{{ tooltip.item.max_durability || 60 }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { shallowRef } from 'vue';

const inventory = shallowRef([]);

// Состояние
const isOpen = ref(false);
const activeSlot = ref(0); // 0-8

const draggedSlotIndex = ref(null);

const mainSlots = Array.from({ length: 36 }, (_, i) => i + 9); // 9-44
const hotbarSlots = Array.from({ length: 9 }, (_, i) => i);    // 0-8

const currentHotbarSlot = ref(0);
const currentTool = ref('hand');



const tooltip = reactive({
    visible: false,
    x: 0,
    y: 0,
    item: null
});

const itemsBySlot = computed(() => {
    const map = Object.create(null);

    for (const item of inventory.value) {
        map[item.slot_index] = item;
    }

    return map;
});


// Получение предмета в конкретном слоте
const getItemAt = (slotIndex) => {
    return itemsBySlot.value[slotIndex] || null;
};


// Метка для отображения в цветном блоке
const getItemLabel = (item) => {
    const id = item.item_id;
    if (id.includes('pickaxe')) return '⛏️';
    if (id.includes('axe')) return '🪓';
    if (id.includes('shovel')) return '🪚';
    if (id === 'dirt') return '🗿';
    if (id === 'grass') return '🌿';
    if (id === 'stone') return '🪨';
    return id.substring(0, 2).toUpperCase();
};

// Отображаемое имя для тултипа
const getItemDisplayName = (item) => {
    const names = {
        'wooden_pickaxe': 'Деревянная кирка',
        'wooden_axe': 'Деревянный топор',
        'wooden_shovel': 'Деревянная лопата',
        'dirt': 'Земля',
        'grass': 'Трава',
        'stone': 'Камень'
    };
    return names[item.item_id] || item.item_id.replace('_', ' ');
};

// Название типа предмета
const getItemTypeName = (type) => {
    const typeNames = {
        'tool': 'Инструмент',
        'block': 'Блок',
        'item': 'Предмет'
    };
    return typeNames[type] || type;
};

// Прочность в процентах
const getDurabilityPercent = (item) => {
    if (item.item_type !== 'tool') return 0;
    const max = item.max_durability || 60;
    const current = item.durability || max;
    return Math.round((current / max) * 100);
};

// ГЕНЕРАЦИЯ ЦВЕТА И СТИЛЯ
const getItemStyle = (item) => {
    const colors = {
        // Инструменты
        'wooden_pickaxe': { bg: '#8B4513', text: '#FFF' },
        'wooden_axe': { bg: '#A0522D', text: '#FFF' },
        'wooden_shovel': { bg: '#D2691E', text: '#FFF' },
        // Блоки
        'dirt': { bg: '#553311', text: '#FFF' },
        'grass': { bg: '#228B22', text: '#FFF' },
        'stone': { bg: '#808080', text: '#FFF' },
        'sand': { bg: '#F4E209', text: '#333' },
        'gravel': { bg: '#8D8D8D', text: '#FFF' },
        'clay': { bg: '#A1887F', text: '#FFF' },
        'beach_sand': { bg: '#F0E68C', text: '#333' }
    };

    const style = colors[item.item_id] || { bg: '#333', text: '#FFF' };

    return {
        backgroundColor: style.bg,
        border: '2px solid rgba(255,255,255,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: style.text,
        fontSize: '14px',
        fontWeight: 'bold',
        width: '100%',
        height: '100%',
        borderRadius: '4px'
    };
};

// Перетаскивание
const handleDragStart = (slotIdx) => {
    draggedSlotIndex.value = slotIdx;
    hideTooltip();
};

// В методе handleDrop
const handleDrop = async (targetSlotIdx) => {
    const sourceIdx = draggedSlotIndex.value;

    if (sourceIdx === null || sourceIdx === targetSlotIdx) return;




    try {
        if (!window.InventoryManager?.optimisticMove) {
            console.error('optimisticMove not found');
            return;
        }

        const result = await window.InventoryManager.optimisticMove(
            sourceIdx,
            targetSlotIdx
        );

        if (!result.success) {
            console.warn('Ошибка перемещения:', result.error);
            // UI уже откатился внутри optimisticMove
        }
    } finally {
        draggedSlotIndex.value = null;
    }
};


// Тултип
const showTooltip = (e, item) => {
    if (!item) return;
    tooltip.item = item;
    tooltip.x = e.clientX + 15;
    tooltip.y = e.clientY - 15;
    tooltip.visible = true;
};

const hideTooltip = () => {
    tooltip.visible = false;
};



// Обновление данных из game_v2.js
const updateData = (data) => {
    if (data?.inventory) {
        inventory.value = data.inventory;
    }
    if (data?.currentHotbarSlot !== undefined) {
        currentHotbarSlot.value = data.currentHotbarSlot;
    }
    if (data?.currentTool) {
        currentTool.value = data.currentTool;
    }
};


// Показать/скрыть инвентарь
const show = () => {
    isOpen.value = true;
};

const hide = () => {
    isOpen.value = false;
};

const isVisible = () => {
    return isOpen.value;
};

// Уведомления
const addNotification = (text, type = 'info') => {
    console.log(`[VueInventory] ${type}: ${text}`);
    // Можно добавить визуальные уведомления
};

// Экспортируем методы глобально для game_v2.js
window.VueInventory = {
    updateData, // 🔥 ВОТ ЭТО ГЛАВНОЕ
    show,
    hide,
    isVisible,
    addNotification
};

// Обработка горячих клавиш
const onKeyDown = (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        isOpen.value = !isOpen.value;
        if (isOpen.value) {
            document.exitPointerLock();
        }
    }
    if (!isOpen.value && e.key >= '1' && e.key <= '9') {
        activeSlot.value = parseInt(e.key) - 1;
    }
};

// Глобальное обновление инвентаря (для вызова из game_v2.js)

onMounted(() => {



    // Слушаем клавиши
    window.addEventListener('keydown', onKeyDown);


});

onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
});

defineExpose({  updateData });
</script>

<style scoped>
/* Основной контейнер UI */
.game-ui {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
    font-family: 'Minecraft', sans-serif;
}

.inventory-overlay {
    pointer-events: all;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Окно в стиле Minecraft */
.mc-window {
    background: #c6c6c6;
    border: 4px solid #373737;
    box-shadow: inset -4px -4px #555555, inset 4px 4px #ffffff;
    padding: 16px;
    image-rendering: pixelated;
    min-width: 450px;
}

.mc-title {
    color: #404040;
    margin-bottom: 12px;
    font-size: 18px;
    text-align: center;
    text-shadow: 2px 2px 0px #fff;
}

.hotbar-label {
    text-align: center;
    margin: 10px 0 5px 0;
    color: #404040;
    font-size: 16px;
}

/* Сетки */
.mc-grid {
    display: grid;
    grid-template-columns: repeat(9, 44px);
    gap: 2px;
}

.main-grid {
    margin-bottom: 14px;
}

/* Слот */
.mc-slot {
    width: 44px;
    height: 44px;
    background: #8b8b8b;
    border: 2px solid #373737;
    box-shadow: inset 3px 3px rgba(0,0,0,0.5), inset -3px -3px rgba(255,255,255,0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    cursor: pointer;
}

.mc-slot:hover {
    background: #bebebe;
    transform: scale(1.05);
}

/* Активный слот в HUD */
.active-slot {
    outline: 4px solid #ffffff !important;
    box-shadow: 0 0 10px #ffffff !important;
    z-index: 10;
    transform: scale(1.05);
}

.has-tool {
    border-color: #ffd700 !important;
}

/* Номера слотов */
.slot-number {
    color: rgba(255, 255, 255, 0.3);
    font-size: 10px;
    position: absolute;
    bottom: 2px;
    right: 2px;
}

.slot-number-hud {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    position: absolute;
    bottom: 2px;
    right: 2px;
}

/* Предметы */
.item-icon-wrapper {
    width: 36px;
    height: 36px;
    cursor: pointer;
    position: relative;
}

.item-color-block {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    box-shadow: inset 0 0 4px rgba(0,0,0,0.3);
}

.item-count {
    position: absolute;
    bottom: 2px;
    right: 4px;
    color: #ffffff;
    text-shadow: 2px 2px 0 #3f3f3f;
    font-size: 12px;
    font-weight: bold;
    pointer-events: none;
}

/* Полоса прочности */
.durability-bar {
    position: absolute;
    bottom: 0;
    left: 2px;
    right: 2px;
    height: 3px;
    background: rgba(0,0,0,0.5);
    border-radius: 1px;
}

.durability-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #FF9800, #F44336);
    border-radius: 1px;
    transition: width 0.3s;
}

/* HUD Хотбар */
.hud-hotbar-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.5);
    padding: 8px;
    border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.2);
}

.hotbar-hud .mc-slot {
    width: 40px;
    height: 40px;
}

/* Minecraft Tooltip */
.mc-tooltip {
    position: fixed;
    background: rgba(16, 0, 16, 0.95);
    border: 2px solid #280659;
    padding: 8px 12px;
    color: #ffffff;
    z-index: 10000;
    pointer-events: none;
    border-image: linear-gradient(#280659, #12022b) 1;
    max-width: 250px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

.tooltip-name {
    color: #ffffff;
    font-size: 16px;
    margin-bottom: 4px;
    font-weight: bold;
}

.tooltip-id {
    color: #777777;
    font-size: 12px;
    margin-bottom: 2px;
}

.tooltip-type {
    color: #aaaaaa;
    font-size: 12px;
    margin-bottom: 4px;
}

.tooltip-quantity {
    color: #4CAF50;
    font-size: 14px;
    margin-top: 4px;
}

.tooltip-durability {
    color: #FF9800;
    font-size: 14px;
    margin-top: 4px;
}

/* Анимация появления */
.mc-fade-enter-active, .mc-fade-leave-active {
    transition: opacity 0.2s;
}

.mc-fade-enter-from, .mc-fade-leave-to {
    opacity: 0;
}

.move-loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10001;
    pointer-events: none;
}
</style>
