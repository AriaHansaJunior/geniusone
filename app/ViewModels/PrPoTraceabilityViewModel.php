<?php

namespace App\ViewModels;

use Illuminate\Support\Collection;

class PrPoTraceabilityViewModel
{
    protected Collection $rows;
    protected array $summary;

    public function __construct(Collection $rows, array $summary = [])
    {
        $this->rows = $rows;
        $this->summary = $summary;
    }

    public static function create(Collection $rows, array $summary = []): self
    {
        return new self($rows, $summary);
    }

    public function toArray(): array
    {
        return [
            'summary' => $this->summary,
            'total_rows' => $this->rows->count(),
            'rows' => $this->rows->map(function ($row) {
                return array_merge($row, [
                    'status_badge' => $this->getStatusBadge($row['fulfillment_status']),
                    'formatted_ordered' => number_format((float) $row['ordered_quantity'], 2),
                    'formatted_net_received' => number_format((float) $row['net_received_quantity'], 2),
                    'formatted_outstanding' => number_format((float) $row['outstanding_quantity'], 2),
                    'fulfillment_percentage' => $row['ordered_quantity'] > 0 
                        ? round(($row['net_received_quantity'] / $row['ordered_quantity']) * 100, 1) 
                        : 0,
                ]);
            })->values()->toArray(),
        ];
    }

    protected function getStatusBadge(string $status): string
    {
        return match ($status) {
            'FULLY_RECEIVED' => 'success',
            'PARTIAL_RECEIVED' => 'warning',
            'ORDERED' => 'info',
            'OVER_RECEIVED' => 'primary',
            default => 'secondary',
        };
    }
}
