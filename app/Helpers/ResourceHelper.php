<?php

namespace App\Helpers;

class ResourceHelper
{
    /**
     * Получить конфигурацию ресурса
     */
    public static function getConfig(string $resourceId): array
    {
        $config = config('game_resources');

        if (isset($config['resources'][$resourceId])) {
            return array_merge($config['defaults'], $config['resources'][$resourceId]);
        }

        return $config['defaults'];
    }

    /**
     * Проверить, можно ли добывать ресурс
     */
    public static function isMineable(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return !($config['unbreakable'] ?? false);
    }

    /**
     * Получить количество дропа
     */
    public static function getDropCount(string $resourceId): int
    {
        $config = self::getConfig($resourceId);
        return $config['drop'] ?? 1;
    }

    /**
     * Проверить, является ли ресурс конечным
     */
    public static function isFinite(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return $config['finite'] ?? true;
    }

    /**
     * Проверить, является ли ресурс персистентным
     */
    public static function isPersistent(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return $config['persistent'] ?? false;
    }

    /**
     * Получить категорию ресурса
     */
    public static function getCategory(string $resourceId): string
    {
        $config = self::getConfig($resourceId);
        return $config['category'] ?? 'unknown';
    }

    /**
     * Проверить, является ли ресурс стакаемым
     */
    public static function isStackable(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return $config['stackable'] ?? true;
    }

    /**
     * Получить максимальный стак
     */
    public static function getMaxStack(string $resourceId): int
    {
        $config = self::getConfig($resourceId);
        if ($config['stackable'] ?? true) {
            return config('game_resources.max_stack');
        }
        return 1;
    }

    /**
     * Получить тип предмета
     */
    public static function getItemType(string $resourceId): string
    {
        $config = self::getConfig($resourceId);
        return $config['item_type'] ?? 'block';
    }

    /**
     * Получить все ресурсы категории
     */
    public static function getResourcesByCategory(string $category): array
    {
        $config = config('game_resources');
        $resources = [];

        foreach ($config['resources'] as $resourceId => $resourceConfig) {
            if (($resourceConfig['category'] ?? 'unknown') === $category) {
                $resources[$resourceId] = array_merge($config['defaults'], $resourceConfig);
            }
        }

        return $resources;
    }

    /**
     * Получить все стакаемые ресурсы
     */
    public static function getStackableResources(): array
    {
        $config = config('game_resources');
        $resources = [];

        foreach ($config['resources'] as $resourceId => $resourceConfig) {
            $fullConfig = array_merge($config['defaults'], $resourceConfig);
            if ($fullConfig['stackable']) {
                $resources[$resourceId] = $fullConfig;
            }
        }

        return $resources;
    }

    /**
     * Получить все добываемые ресурсы
     */
    public static function getMineableResources(): array
    {
        $config = config('game_resources');
        $resources = [];

        foreach ($config['resources'] as $resourceId => $resourceConfig) {
            $fullConfig = array_merge($config['defaults'], $resourceConfig);
            if (!$fullConfig['unbreakable']) {
                $resources[$resourceId] = $fullConfig;
            }
        }

        return $resources;
    }

    /**
     * Проверить, является ли ресурс жидкостью
     */
    public static function isLiquid(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return ($config['category'] ?? '') === 'liquid';
    }

    /**
     * Проверить, является ли ресурс растением
     */
    public static function isPlant(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return ($config['category'] ?? '') === 'plant';
    }

    /**
     * Проверить, является ли ресурс рудой
     */
    public static function isOre(string $resourceId): bool
    {
        $config = self::getConfig($resourceId);
        return ($config['category'] ?? '') === 'ore';
    }

    /**
     * Получить имя ресурса для отображения
     */
    public static function getDisplayName(string $resourceId): string
    {
        // Преобразуем snake_case в читаемое имя
        $name = str_replace('_', ' ', $resourceId);

        // Убираем префикс ore_ если есть
        if (str_starts_with($name, 'ore ')) {
            $name = substr($name, 4);
        }

        // Делаем первую букву заглавной
        return ucfirst($name);
    }
}
