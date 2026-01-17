<?php

return [
    'hand' => [
        'name' => 'Рука',
        'durability' => null, // бесконечная
        'mining_level' => 0,
        'mining_speed' => 1.0,
        'damage' => 1,
        'can_mine' => ['plant', 'dirt', 'wood']
    ],
    'axe' => [
        'name' => 'Деревянный топор',
        'durability' => 60,
        'mining_level' => 1,
        'mining_speed' => 2.0,
        'damage' => 4,
        'can_mine' => ['plant', 'wood', 'leaves']
    ],
    'shovel' => [
        'name' => 'Деревянная лопата',
        'durability' => 60,
        'mining_level' => 1,
        'mining_speed' => 2.0,
        'damage' => 3,
        'can_mine' => ['dirt', 'sand', 'gravel', 'clay']
    ],
    'pickaxe' => [
        'name' => 'Деревянная кирка',
        'durability' => 60,
        'mining_level' => 1,
        'mining_speed' => 2.0,
        'damage' => 3,
        'can_mine' => ['stone', 'ore', 'mineral']
    ]
];
