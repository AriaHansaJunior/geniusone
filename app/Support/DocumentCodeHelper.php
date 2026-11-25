<?php

namespace App\Support;

final class DocumentCodeHelper
{
    public static function decode(string $code): string
    {
        return urldecode($code);
    }

    public static function hyphenToSlash(string $code): string
    {
        return str_replace('-', '/', self::decode($code));
    }

    public static function toSlug(string $code): string
    {
        return str_replace(['/', ' '], ['-', '_'], trim($code));
    }
}
