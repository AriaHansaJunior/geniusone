<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\JobNumber;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RequestMaterial extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'request_material';

    protected $fillable = [
        'request_number',
        'departments_id',
        'warehouses_id',
        'type_of_request_id',
        'destination_location_id',
        'job_number_id',
        'job_number',
        'customer',
        'project_type',
        'is_internal_warehouse',
        'is_specific_station',
        'creator',
        'updated_by',
        'request_date',
        'note',
        'rejection_note',
        'revision',
        'status',
    ];

    protected $casts = [
        'is_internal_warehouse' => 'boolean',
        'is_specific_station' => 'boolean',
    ];

    public function jobNumberModel(): BelongsTo
    {
        return $this->belongsTo(JobNumber::class, 'job_number_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'departments_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }

    public function typeOfRequest(): BelongsTo
    {
        return $this->belongsTo(TypeOfRequest::class, 'type_of_request_id');
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(DestinationLocation::class, 'destination_location_id');
    }

    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RequestMaterialItem::class, 'request_material_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalRm::class, 'request_material_id');
    }
}
