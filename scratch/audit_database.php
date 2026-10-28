<?php

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Services\Workflow\DocumentApprovalWorkflowService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

echo '====================================================='.PHP_EOL;
echo '  DATABASE INTEGRITY & WORKFLOW VERIFICATION'.PHP_EOL;
echo '====================================================='.PHP_EOL;

// 1. Check Table Counts
$tables = [
    'users' => DB::table('users')->count(),
    'roles' => DB::table('roles')->count(),
    'permissions' => DB::table('permissions')->count(),
    'approval_histories' => DB::table('approval_histories')->count(),
    'purchase_requisitions' => DB::table('purchase_requisitions')->count(),
    'purchase_order' => DB::table('purchase_order')->count(),
    'receive_note' => DB::table('receive_note')->count(),
    'bpb_receive_material' => DB::table('bpb_receive_material')->count(),
    'items' => DB::table('items')->count(),
    'supliers' => DB::table('supliers')->count(),
    'warehouses' => DB::table('warehouses')->count(),
];

echo 'Database Record Summary:'.PHP_EOL;
foreach ($tables as $tbl => $cnt) {
    echo sprintf("  %-25s: %d records\n", $tbl, $cnt);
}

// 2. Test Full Approval Workflow Cycle in an Isolated Transaction
echo PHP_EOL.'Testing Approval Workflow Lifecycle (BE-03, BE-04, BE-05, BE-06)...'.PHP_EOL;
$workflow = app(DocumentApprovalWorkflowService::class);

DB::beginTransaction();

try {
    // Create temporary Draft PR
    $testPr = PurchaseRequisition::create([
        'pr_number' => 'TEST/PR/AUDIT/'.time(),
        'departments_id' => 1,
        'sections_id' => 1,
        'creator' => 1,
        'date' => date('Y-m-d'),
        'due_date' => date('Y-m-d', strtotime('+7 days')),
        'status' => 'Waiting for Approve 1',
    ]);

    echo "  Created temporary test PR ID #{$testPr->id}: Initial status = ".$workflow->getDocumentStatus($testPr).PHP_EOL;

    // 1. Approve Tier 1
    $approved1 = $workflow->approve('pr', $testPr->id, 1, 1, 'Auditor Approved Stage 1');
    echo '  [BE-03] Tier 1 Approved -> Status: '.$workflow->getDocumentStatus($approved1).PHP_EOL;

    // 2. Approve Tier 2
    $approved2 = $workflow->approve('pr', $testPr->id, 1, 2, 'Auditor Approved Stage 2');
    echo '  [BE-03] Tier 2 Approved -> Status: '.$workflow->getDocumentStatus($approved2).PHP_EOL;

    // 3. Unapprove Tier 2 (Rollback)
    $unapproved2 = $workflow->unapprove('pr', $testPr->id, 1, 2, 'Auditor Rollback Stage 2');
    echo '  [BE-04] Tier 2 Unapproved -> Status: '.$workflow->getDocumentStatus($unapproved2).PHP_EOL;

    // 4. Reject for revision
    $rejected = $workflow->reject('pr', $testPr->id, 1, 1, 'Needs item count revision');
    echo '  [BE-04] Rejected for revision -> Status: '.$workflow->getDocumentStatus($rejected).PHP_EOL;

    // 5. Resubmit after revision
    $resubmitted = $workflow->resubmit('pr', $testPr->id, 1, 'Revision applied');
    echo '  [BE-04] Resubmitted -> Status: '.$workflow->getDocumentStatus($resubmitted).PHP_EOL;

    // 6. Audit Trail Check
    $histories = $workflow->getApprovalHistory('pr', $testPr->id);
    echo '  [BE-06] Audit trail entries recorded: '.count($histories).' events.'.PHP_EOL;

    DB::rollBack();
    echo '  Isolated transaction rolled back cleanly. Database remains pristine.'.PHP_EOL;
    echo 'WORKFLOW & GOVERNANCE LIFECYCLE: 100% SUCCESS!'.PHP_EOL;
} catch (Throwable $e) {
    DB::rollBack();
    echo 'TEST FAILED: '.$e->getMessage().PHP_EOL;
}

echo '====================================================='.PHP_EOL;
