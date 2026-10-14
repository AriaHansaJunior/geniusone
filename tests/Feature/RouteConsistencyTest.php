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
            '/procurement/transactions/purchase-order',
            '/procurement/reports/report-pr-po',
            '/exim/master/unit',
            '/exim/master/satuan',
            '/exim/master/item',
            '/exim/master/brand',
            '/exim/master/facility',
            '/exim/master/hs',
            '/exim/master/category',
            '/exim/master/style',
            '/exim/master/colour',
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
}
