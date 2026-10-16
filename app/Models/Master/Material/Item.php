<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;
use App\Models\Master\Customs\Facility;
use App\Models\Master\Organization\JobNumber;

class Item extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'items';

    protected $fillable = [
        'categories_id',
        'classifications_id',
        'status',
        'code',
        'external_code',
        'name',
        'trace_by_lot',
        'facilities_id',
        'origins_id',
        'item_types_id',
        'units_of_measurements_id',
        'unit_conversion',
        'netto',
        'colours_id',
        'brands_id',
        'size',
        'dimension_p',
        'dimension_l',
        'dimension_t',
        'styles_id',
        'customs_reports_id',
        'group_scrap_items_id',
        'specifications_id',
        'hs_code_id',
        'stock',
        'updated_by',
        'created_by',
        'smallest_unit_id',
        'greatest_unit_id',
        'job_number_id',
    ];

    public function classification(): BelongsTo
    {
        return $this->belongsTo(Classification::class, 'classifications_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'categories_id');
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class, 'facilities_id');
    }

    public function unitOfMeasurement(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasurement::class, 'units_of_measurements_id');
    }

    public function smallestUnit(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasurement::class, 'smallest_unit_id');
    }

    public function greatestUnit(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasurement::class, 'greatest_unit_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\System\Auth\User::class, 'created_by');
    }

    public function jobNumber(): BelongsTo
    {
        return $this->belongsTo(JobNumber::class, 'job_number_id');
    }
}
