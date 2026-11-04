<?php

namespace Database\Seeders;

use App\Models\Master\Material\Category;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\Section;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use Illuminate\Database\Seeder;

class MasterDepartmentSectionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Departments
        $departments = [
            'REFINING',
            'REVERB',
            'SMELTING',
            'MAINTENANCE',
            'LOGISTICS',
            'LABORATORY',
            'PROCUREMENT',
            'HSE',
            'TEKNIK',
            'PPIC',
            'HRD',
            'ACC',
            'BB',
            'FURNACE',
            'IT',
            'MARKETING',
            'PLASTIK',
            'PRODUCTION PLANNINGS',
            'PURCHASING',
            'QC',
            'Produksi & Operasional',
            'Produksi & Smelting',
            'Maintenance & Engineering',
            'HSE & K3',
            'PPIC & Logistik',
        ];

        foreach ($departments as $name) {
            Department::firstOrCreate(['name' => $name], ['status' => 1]);
        }

        // 2. Sections
        $sections = [
            'Section 01',
            'Section 02',
            'Furnace A',
            'Furnace B',
            'General Maintenance',
            'Utility',
            'General',
            'Smelting Furnace Unit',
            'Mechanical & Electrical',
            'Safety & Environment',
            'Raw Material Yard',
        ];

        foreach ($sections as $name) {
            Section::firstOrCreate(['name' => $name], ['status' => 1]);
        }

        // 3. Ensure Items from catalogs exist in DB
        $firstItem = Item::first();
        $fallbackClassId = $firstItem?->classifications_id ?? 1;
        $fallbackFacilityId = $firstItem?->facilities_id ?? 1;
        $fallbackItemTypeId = $firstItem?->item_types_id ?? 1;
        $fallbackUomId = $firstItem?->units_of_measurements_id ?? 1;
        $fallbackCatId = $firstItem?->categories_id ?? 1;

        $catalogItems = [
            [
                'code' => '30.200.010.003',
                'name' => 'Flux Refining Powder Smelting Grade',
            ],
            [
                'code' => '60.154.300.101',
                'name' => 'Nozzle Jet Spray Spiral SUS 316 size ½" (Male thread)',
            ],
            [
                'code' => '10.002.400.020',
                'name' => 'Pulpen Gel Ballpoint 0.5 Black Standard',
            ],
            [
                'code' => '80.100.001.001',
                'name' => 'Laptop ThinkPad T14 Gen 4 Core i7 16GB',
            ],
            [
                'code' => '10.100.100.005',
                'name' => 'Hard lead lokal (M)',
            ],
            [
                'code' => '10.100.100.006',
                'name' => 'Timah Import Lead Ingot',
            ],
            [
                'code' => '10.100.100.007',
                'name' => 'Battery Scrap',
            ],
        ];

        foreach ($catalogItems as $itemDef) {
            Item::firstOrCreate(
                ['code' => $itemDef['code']],
                [
                    'name' => $itemDef['name'],
                    'classifications_id' => $fallbackClassId,
                    'facilities_id' => $fallbackFacilityId,
                    'item_types_id' => $fallbackItemTypeId,
                    'categories_id' => $fallbackCatId,
                    'units_of_measurements_id' => $fallbackUomId,
                    'status' => 1,
                    'stock' => 100,
                ]
            );
        }

        // 4. Update PR 0003/PR-IMLI/XI/2026 to have REFINING department
        $refiningDept = Department::where('name', 'REFINING')->first();
        if ($refiningDept) {
            PurchaseRequisition::where('pr_number', '0003/PR-IMLI/XI/2026')
                ->update(['departments_id' => $refiningDept->id]);
        }
    }
}
