<?php

return [
    'planets' => [
        'earth' => [
            'sector_size' => 48,
            'vein_chance' => 0.4,
            'indicator' => [
                'chance' => 0.012, // Редкость точек (0.01 - 0.05)
                'scale'  => 4.9,  // Кучность (чем выше, тем меньше точки 0.01 -5.0)
            ],
            'veins' => [
                'iron_vein' => [
                    'rarity'  => 50,
                    'radius'  => 18,
                    'density' => 0.7,
                    'ores'    => [
                        'primary'   => 'ore_brown_limonite',
                        'secondary' => 'ore_yellow_limonite',
                        'between'   => 'ore_malachite',
                        'sporadic'  => 'ore_iron'
                    ],
                    'indicator' => 'ore_iron'
                ],
                'tin_vein' => [
                    'rarity'  => 30,
                    'radius'  => 14,
                    'density' => 0.6,
                    'ores'    => [
                        'primary'   => 'ore_cassiterite',
                        'secondary' => 'ore_tin',
                        'between'   => 'ore_bismuth',
                        'sporadic'  => 'ore_tin'
                    ],
                    'indicator' => 'ore_tin'
                ],
                // Сюда потом допишешь медь, золото и т.д.
            ]
        ],
        // Когда придет время, просто добавишь 'mars' => [...] сюда
    ]
];
