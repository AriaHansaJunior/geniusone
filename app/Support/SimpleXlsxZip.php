<?php

namespace App\Support;

use RuntimeException;

/**
 * Lightweight pure-PHP PKZIP helper (RFC-1951 via zlib) used as fallback
 * when PHP's native ZipArchive extension (ext-zip) is not loaded.
 */
class SimpleXlsxZip
{
    /**
     * Build a standard uncompressed/deflated ZIP binary from ['path/inside.xml' => 'contents'].
     *
     * @param  array<string, string>  $entries
     */
    public static function createBinary(array $entries): string
    {
        if (! function_exists('gzdeflate') || ! function_exists('crc32')) {
            throw new RuntimeException('ZIP creation requires ext-zip or PHP zlib extension.');
        }

        $localData = '';
        $centralDir = '';
        $offset = 0;
        $count = 0;

        foreach ($entries as $name => $content) {
            $nameBytes = str_replace('\\', '/', (string) $name);
            $raw = (string) $content;
            $uncompSize = strlen($raw);
            $crc = crc32($raw) & 0xFFFFFFFF;
            $compressed = gzdeflate($raw, 6);
            if ($compressed === false) {
                $compressed = $raw;
                $method = 0;
                $compSize = $uncompSize;
            } else {
                $method = 8;
                $compSize = strlen($compressed);
            }

            $nameLen = strlen($nameBytes);

            $localHeader = pack(
                'VvvvvvVVVvv',
                0x04034B50, // Local file header signature
                20,         // Version needed to extract (2.0)
                0,          // General purpose bit flag
                $method,    // Compression method (8 = deflate, 0 = store)
                0,          // Last mod file time
                0x5421,     // Last mod file date
                $crc,       // CRC-32
                $compSize,  // Compressed size
                $uncompSize,// Uncompressed size
                $nameLen,   // File name length
                0           // Extra field length
            );

            $localData .= $localHeader.$nameBytes.$compressed;

            $centralHeader = pack(
                'VvvvvvvVVVvvvvvVV',
                0x02014B50, // Central file header signature
                20,         // Version made by
                20,         // Version needed to extract
                0,          // General purpose bit flag
                $method,    // Compression method
                0,          // Last mod file time
                0x5421,     // Last mod file date
                $crc,       // CRC-32
                $compSize,  // Compressed size
                $uncompSize,// Uncompressed size
                $nameLen,   // File name length
                0,          // Extra field length
                0,          // File comment length
                0,          // Disk number start
                0,          // Internal file attributes
                0,          // External file attributes
                $offset     // Relative offset of local header
            );

            $centralDir .= $centralHeader.$nameBytes;
            $offset += strlen($localHeader) + $nameLen + $compSize;
            $count++;
        }

        $eocd = pack(
            'VvvvvVVv',
            0x06054B50,          // End of central dir signature
            0,                   // Disk number
            0,                   // Start disk
            $count,              // Entries on disk
            $count,              // Total entries
            strlen($centralDir), // Size of central directory
            $offset,             // Offset of central directory
            0                    // Comment length
        );

        return $localData.$centralDir.$eocd;
    }

    /**
     * Extract all entries from a ZIP file into ['entry_name' => 'contents'].
     *
     * @return array<string, string>
     */
    public static function extractEntries(string $filePath): array
    {
        if (! is_file($filePath) || ! is_readable($filePath)) {
            return [];
        }

        $data = file_get_contents($filePath);
        if ($data === false || strlen($data) < 22) {
            return [];
        }

        $eocdPos = strrpos($data, "\x50\x4b\x05\x06");
        if ($eocdPos === false || strlen($data) < $eocdPos + 22) {
            return [];
        }

        $eocd = unpack('Vsig/vdisk/vcdDisk/vdiskEntries/vtotalEntries/VcdSize/VcdOffset/vcommentLen', substr($data, $eocdPos, 22));
        $cdOffset = $eocd['cdOffset'];
        $totalEntries = $eocd['totalEntries'];

        $entries = [];
        $pos = $cdOffset;

        for ($i = 0; $i < $totalEntries; $i++) {
            if (strlen($data) < $pos + 46) {
                break;
            }
            $hdr = substr($data, $pos, 46);
            if (substr($hdr, 0, 4) !== "\x50\x4b\x01\x02") {
                break;
            }
            $cd = unpack('Vsig/vmade/vneed/vflag/vmethod/vmtime/vmdate/Vcrc/VcompSize/VuncompSize/vnameLen/vextraLen/vcommentLen/vdisk/vintAttr/VextAttr/VlocalOffset', $hdr);
            $name = substr($data, $pos + 46, $cd['nameLen']);
            $pos += 46 + $cd['nameLen'] + $cd['extraLen'] + $cd['commentLen'];

            $locOffset = $cd['localOffset'];
            if (strlen($data) < $locOffset + 30 || substr($data, $locOffset, 4) !== "\x50\x4b\x03\x04") {
                continue;
            }
            $loc = unpack('Vsig/vneed/vflag/vmethod/vmtime/vmdate/Vcrc/VcompSize/VuncompSize/vnameLen/vextraLen', substr($data, $locOffset, 30));
            $dataStart = $locOffset + 30 + $loc['nameLen'] + $loc['extraLen'];
            $rawPayload = substr($data, $dataStart, $cd['compSize']);

            if ($cd['method'] === 0) {
                $entries[$name] = $rawPayload;
            } elseif ($cd['method'] === 8 && function_exists('gzinflate')) {
                $inflated = @gzinflate($rawPayload);
                if ($inflated !== false) {
                    $entries[$name] = $inflated;
                }
            }
        }

        return $entries;
    }
}
