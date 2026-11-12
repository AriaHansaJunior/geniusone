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
        $rows = DB::table('purchase_order_has_purchase_requisitions as pohpr')
            ->leftJoin('items as i', 'pohpr.items_id', '=', 'i.id')
            ->leftJoin('purchase_requisitions_has_items as prhi', 'pohpr.pr_has_items_id', '=', 'prhi.id')
            ->leftJoin('items as pri', 'prhi.items_id', '=', 'pri.id')
            ->select(
                'pohpr.id',
                'pohpr.item_alias',
                'pohpr.items_id',
                'i.name as item_name',
                'i.code as item_code',
                'pri.name as pr_item_name',
                'pri.code as pr_item_code'
            )
            ->get();

        foreach ($rows as $r) {
            $effectiveName = $r->item_name ?? $r->pr_item_name;
            $code1 = $r->item_code;
            $code2 = $r->pr_item_code;

            $alias = trim((string) $r->item_alias);

            $needsUpdate = false;
            if ($alias === '' || in_array($alias, ['—', '-'], true)) {
                $needsUpdate = true;
            } elseif ($code1 && $alias === $code1) {
                $needsUpdate = true;
            } elseif ($code2 && $alias === $code2) {
                $needsUpdate = true;
            } elseif (strlen($alias) < 20 && preg_match('/^[0-9A-Z.\-]+$/', $alias) && ! str_contains($alias, ' ')) {
                // If it looks like a material code (e.g. 80.200.001.409 or MAT-ST-001)
                $matchedItem = DB::table('items')->where('code', $alias)->first();
                if ($matchedItem) {
                    $effectiveName = $matchedItem->name;
                    $needsUpdate = true;
                }
            }

            if ($needsUpdate && $effectiveName) {
                DB::table('purchase_order_has_purchase_requisitions')
                    ->where('id', $r->id)
                    ->update(['item_alias' => $effectiveName]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op rollback
    }
};
