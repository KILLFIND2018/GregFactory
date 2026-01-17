<?php

return [
    'max_stack' => 64,

    // Стандартные значения по умолчанию
    'defaults' => [
        'finite' => true,
        'drop' => 1,
        'persistent' => false,
        'unbreakable' => false,
        'stackable' => true,
        'item_type' => 'block'
    ],

    'resources' => [
        // === БЕСКОНЕЧНЫЕ С ДРОПОМ (persistent) ===
        'stone' => [
            'finite' => false,
            'drop' => 1,
            'persistent' => true,  // Остается на карте после добычи
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'mineral'
        ],

        // === КОНЕЧНЫЕ ГРУНТОВЫЕ БЛОКИ ===
        'dirt' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],
        'sand' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],
        'gravel' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],
        'clay' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],
        'beach_sand' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],
        'desert_sand' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],
        'snow' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],

        // === РАСТЕНИЯ И ЦВЕТЫ ===
        'grass' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'grass_detail' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'flower_red' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'flower_yellow' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'flower_white' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'cactus' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'bush_cold' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'sugar_cane' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'plant'
        ],
        'stone_flower' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'mineral' // Каменный цветок
        ],

        // === ДЕРЕВЬЯ ===
        'tree' => [
            'finite' => true,
            'drop' => 3,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'wood'
        ],
        'jungle_tree' => [
            'finite' => true,
            'drop' => 4,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'wood'
        ],
        'pine' => [
            'finite' => true,
            'drop' => 3,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'wood'
        ],

        // === РУДА ===
        'ore_andesite' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_basalt' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_brown_limonite' => [
            'finite' => true,
            'drop' => 2,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_yellow_limonite' => [
            'finite' => true,
            'drop' => 2,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_malachite' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_copper' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_cassiterite' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_tin' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],
        'ore_bismuth' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ore'
        ],

        // === ДЕКОРАТИВНЫЕ БЛОКИ ===
        'rock_peak' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'mineral'
        ],
        'snow_peak' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'mineral'
        ],

        // === ВОДА И ЖИДКОСТИ ===
        'water' => [
            'finite' => false,
            'drop' => 0,
            'unbreakable' => true,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid'
        ],
        'deep_ocean' => [
            'finite' => false,
            'drop' => 0,
            'unbreakable' => true,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid'
        ],
        'ocean' => [
            'finite' => false,
            'drop' => 0,
            'unbreakable' => true,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid'
        ],
        'lake' => [
            'finite' => false,
            'drop' => 0,
            'unbreakable' => true,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid'
        ],

        // === ДОПОЛНИТЕЛЬНЫЕ БЛОКИ ИЗ ГЕНЕРАЦИИ (которых нет в RESOURCE_CONFIG) ===
        'sand_ground' => [
            'finite' => true,
            'drop' => 1,
            'item_type' => 'block',
            'stackable' => true,
            'category' => 'ground'
        ],

        // Каменные цветы/индикаторы руды (они же surface индикаторы)
        'ore_andesite_surface' => [
            'finite' => true,
            'drop' => 0, // Не дают ресурсов при добыче
            'item_type' => 'indicator',
            'stackable' => false,
            'category' => 'indicator'
        ],
        'ore_basalt_surface' => [
            'finite' => true,
            'drop' => 0,
            'item_type' => 'indicator',
            'stackable' => false,
            'category' => 'indicator'
        ],
        'ore_copper_surface' => [
            'finite' => true,
            'drop' => 0,
            'item_type' => 'indicator',
            'stackable' => false,
            'category' => 'indicator'
        ],

        // ЖИДКОСТИ (нефть и производные)
        'raw_oil' => [
            'finite' => true,
            'drop' => 0, // Для жидкостей отдельная механика
            'unbreakable' => false,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid',
            'can_mine' => true,
            'mining_tool' => 'bucket' // Предполагаем, что нужен ковш
        ],
        'heavy_oil' => [
            'finite' => true,
            'drop' => 0,
            'unbreakable' => false,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid',
            'can_mine' => true,
            'mining_tool' => 'bucket'
        ],
        'light_oil' => [
            'finite' => true,
            'drop' => 0,
            'unbreakable' => false,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid',
            'can_mine' => true,
            'mining_tool' => 'bucket'
        ],
        'oil' => [
            'finite' => true,
            'drop' => 0,
            'unbreakable' => false,
            'item_type' => 'liquid',
            'stackable' => false,
            'category' => 'liquid',
            'can_mine' => true,
            'mining_tool' => 'bucket'
        ],
    ],

    // Категории ресурсов
    'categories' => [
        'ground' => [
            'name' => 'Грунтовые блоки',
            'sort_order' => 1
        ],
        'plant' => [
            'name' => 'Растения',
            'sort_order' => 2
        ],
        'wood' => [
            'name' => 'Деревья',
            'sort_order' => 3
        ],
        'mineral' => [
            'name' => 'Минералы',
            'sort_order' => 4
        ],
        'ore' => [
            'name' => 'Руда',
            'sort_order' => 5
        ],
        'liquid' => [
            'name' => 'Жидкости',
            'sort_order' => 6
        ],
        'indicator' => [
            'name' => 'Индикаторы',
            'sort_order' => 7
        ]
    ],

    // Вспомогательные методы
    'helpers' => [
        // Получить конфигурацию ресурса
        'getResourceConfig' => function($resourceId) {
            $config = config('game_resources');

            if (isset($config['resources'][$resourceId])) {
                return array_merge($config['defaults'], $config['resources'][$resourceId]);
            }

            return $config['defaults'];
        },

        // Проверить, можно ли добывать ресурс
        'isMineable' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            return !($config['unbreakable'] ?? false);
        },

        // Получить количество дропа
        'getDropCount' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            return $config['drop'] ?? 1;
        },

        // Проверить, является ли ресурс конечным
        'isFinite' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            return $config['finite'] ?? true;
        },

        // Проверить, является ли ресурс персистентным
        'isPersistent' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            return $config['persistent'] ?? false;
        },

        // Получить категорию ресурса
        'getCategory' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            return $config['category'] ?? 'unknown';
        },

        // Проверить, является ли ресурс стакаемым
        'isStackable' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            return $config['stackable'] ?? true;
        },

        // Получить максимальный стак
        'getMaxStack' => function($resourceId) {
            $config = config('game_resources.helpers.getResourceConfig')($resourceId);
            if ($config['stackable'] ?? true) {
                return config('game_resources.max_stack');
            }
            return 1;
        }
    ]
];
