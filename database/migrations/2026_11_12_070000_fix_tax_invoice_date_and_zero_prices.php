<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fix tax_invoice_date for receive_notes that have a tax invoice number
        DB::table('receive_note')
            ->whereNotNull('tax_invoice')
            ->where('tax_invoice', '!=', '')
            ->where('tax_invoice', '!=', '-')
            ->whereNull('tax_invoice_date')
            ->update([
                'tax_invoice_date' => DB::raw("COALESCE(invoice_date, arrival_date, CURDATE())"),
            ]);

        // 2. Catalog standard price mappings for materials
        $priceMap = [
            'Nozzle Jet Spray' => 350000.0,
            'Besi UNP 150' => 750000.0,
            'Besi UNP 200' => 850000.0,
            'Besi UNP' => 750000.0,
            'Besi H-Beam 200' => 1850000.0,
            'Besi H-Beam 150' => 1450000.0,
            'Besi H-Beam' => 1650000.0,
            'Steel Plate Grade SS400 10mm' => 250000.0,
            'Steel Plate SS400 10mm x 5ft x 20ft' => 2850000.0,
            'Sulfuric Acid' => 4500000.0,
            'Electric Motor' => 18750000.0,
            'Centrifugal Slurry Pump' => 8500000.0,
            'Hydraulic Oil' => 6500000.0,
            'Battery Scrap' => 18800.0,
            'Timah Import' => 40000.0,
            'Hard lead' => 38500.0,
            'Laptop ThinkPad' => 18500000.0,
            'Pulpen Gel' => 5000.0,
            'Flux Refining' => 120000.0,
            'Refractory Fire Brick' => 75000.0,
            'Welding Electrode' => 125000.0,
            'Safety Helmet' => 150000.0,
            'High Temperature Filter Bag' => 450000.0,
        ];

        // 3. Update purchase_order_has_receive_note items with zero price
        $rnItems = DB::table('purchase_order_has_receive_note')
            ->where('price', '<=', 0)
            ->get();

        foreach ($rnItems as $it) {
            $assignedPrice = 100000.0;
            foreach ($priceMap as $pattern => $p) {
                if (stripos($it->item_name, $pattern) !== false) {
                    $assignedPrice = $p;
                    break;
                }
            }
            $qty = (float) $it->quantity > 0 ? (float) $it->quantity : 1.0;
            $newTotal = $qty * $assignedPrice;

            DB::table('purchase_order_has_receive_note')
                ->where('id', $it->id)
                ->update([
                    'price' => $assignedPrice,
                    'grand_total' => $newTotal,
                ]);
        }

        // 4. Update purchase_order_has_purchase_requisitions items with zero price
        $poItems = DB::table('purchase_order_has_purchase_requisitions')
            ->where('price', '<=', 0)
            ->get();

        foreach ($poItems as $it) {
            $assignedPrice = 100000.0;
            $name = $it->item_alias ?? '';
            foreach ($priceMap as $pattern => $p) {
                if (stripos($name, $pattern) !== false) {
                    $assignedPrice = $p;
                    break;
                }
            }
            $qty = (float) $it->order > 0 ? (float) $it->order : ((float) $it->purchased > 0 ? (float) $it->purchased : 1.0);
            $newTotal = $qty * $assignedPrice;

            DB::table('purchase_order_has_purchase_requisitions')
                ->where('id', $it->id)
                ->update([
                    'price' => $assignedPrice,
                    'total' => $newTotal,
                    'dpp' => $newTotal,
                    'grand_total' => $newTotal,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed
    }
};

