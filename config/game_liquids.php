<?php

return [
    'planets' => [
        'earth' => [
            'liquids' => [
                'oil' => [
                    'chance' => 20,
                    'decrease_per_operation' => 5,
                    'max_amount' => 625,
                    'min_amount' => 0,
                    'registry' => 'oil'
                ],
                'light_oil' => [
                    'chance' => 15,
                    'decrease_per_operation' => 4,
                    'max_amount' => 550,
                    'min_amount' => 0,
                    'registry' => 'light_oil'
                ],
                'heavy_oil' => [
                    'chance' => 10,
                    'decrease_per_operation' => 6,
                    'max_amount' => 700,
                    'min_amount' => 0,
                    'registry' => 'heavy_oil'
                ],
                'raw_oil' => [
                    'chance' => 25,
                    'decrease_per_operation' => 5,
                    'max_amount' => 600,
                    'min_amount' => 0,
                    'registry' => 'raw_oil'
                ],

            ]
        ]
    ]
];
