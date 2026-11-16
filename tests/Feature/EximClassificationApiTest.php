<?php

namespace Tests\Feature;

use App\Models\Master\Finance\Account;
use App\Models\Master\Organization\ReportingType;
use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximClassificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_classification_uses_selected_account_and_reporting_type_references(): void
    {
        $user = User::query()->create([
            'username' => 'classification-test-user',
            'name' => 'Classification Test User',
            'email' => 'classification-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $account = Account::query()->create([
            'code' => '1140',
            'name' => 'Raw Materials',
            'category' => 'Inventory',
            'status' => 'active',
        ]);
        $reportingType = ReportingType::query()->create([
            'name' => 'Material Movement',
            'status' => 1,
        ]);

        $this->getJson('/api/exim/master/reporting-types')
            ->assertOk()
            ->assertJsonPath('data.0.id', $reportingType->id)
            ->assertJsonPath('data.0.name', $reportingType->name);

        $response = $this->postJson('/api/exim/master/classifications', [
            'code' => 'RM-01',
            'name' => 'Raw Material',
            'reporting_types_id' => $reportingType->id,
            'accounts_id' => $account->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.reporting_types_id', $reportingType->id)
            ->assertJsonPath('data.accounts_id', $account->id)
            ->assertJsonPath('data.reporting_type.name', $reportingType->name)
            ->assertJsonPath('data.account.code', $account->code);

        $this->assertDatabaseHas('classifications', [
            'id' => $response->json('data.id'),
            'reporting_types_id' => $reportingType->id,
            'accounts_id' => $account->id,
            'code' => 'RM-01',
        ]);
    }
}
