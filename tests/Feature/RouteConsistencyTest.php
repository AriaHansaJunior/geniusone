<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RouteConsistencyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test key application routes return 200 OK.
     */
    public function test_key_application_routes_resolve_successfully(): void
    {
        $routes = [
            '/',
            '/dashboard',
            '/procurement/purchase-master/supplier',
            '/procurement/purchase-master/payment-term',
            '/procurement/purchase-master/purchase-category',
            '/procurement/purchase-master/delivery-terms',
            '/procurement/purchase-master/additional-costs',
            '/procurement/purchase-master/pph',
            '/procurement/transactions/purchase-requisition',
            '/procurement/transactions/purchase-requisition/create',
            '/procurement/transactions/purchase-order',
            '/procurement/transactions/purchase-order/create',
            '/procurement/reports/report-pr-po',
            '/procurement/purchase-master/rafaksi-type',
            '/procurement/purchase-master/job-number',
            '/exim/master/unit',
            '/exim/master/satuan',
            '/exim/master/item',
            '/exim/master/brand',
            '/exim/master/facility',
            '/exim/master/hs',
            '/exim/master/category',
            '/exim/master/style',
            '/exim/master/colour',
            '/exim/master/country',
            '/exim/master/currency',
            '/exim/master/account',
            '/exim/receive-note',
            '/exim/receive-note-return',
            '/exim/document-history',
            '/warehouse/master/warehouse',
        ];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertStatus(200);
        }
    }

    /**
     * Test unknown route returns 404 Not Found state.
     */
    public function test_unknown_route_returns_404(): void
    {
        $response = $this->get('/non-existent-route-for-testing-404');
        $response->assertStatus(404);
        $response->assertSee('data-initial-page="not-found"', false);
    }

    /**
     * Test newly added master data and transaction create routes render with exact initial-page attribute.
     */
    public function test_new_master_and_transaction_routes_resolve_with_correct_page_attribute(): void
    {
        $map = [
            '/exim/master/country' => 'country',
            '/exim/country' => 'country',
            '/exim/master/currency' => 'currency',
            '/exim/currency' => 'currency',
            '/exim/master/account' => 'account',
            '/exim/account' => 'account',
            '/procurement/purchase-master/job-number' => 'job-number',
            '/procurement/job-number' => 'job-number',
            '/procurement/purchase-master/rafaksi-type' => 'rafaksi-type',
            '/procurement/rafaksi-type' => 'rafaksi-type',
            '/procurement/transactions/purchase-requisition/create' => 'pr-create',
            '/pr/create' => 'pr-create',
            '/procurement/transactions/purchase-order/create' => 'po-create',
            '/po/create' => 'po-create',
        ];

        foreach ($map as $url => $expectedPage) {
            $response = $this->get($url);
            $response->assertStatus(200);
            $response->assertSee('data-initial-page="' . $expectedPage . '"', false);
        }
    }
}
