<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModularApiTest extends TestCase
{
    use RefreshDatabase;
    /**
     * Test Procurement Master APIs.
     */
    public function test_procurement_master_apis(): void
    {
        $endpoints = [
            '/api/procurement/master/suppliers',
            '/api/procurement/master/payment-terms',
            '/api/procurement/master/purchase-categories',
            '/api/procurement/master/delivery-terms',
            '/api/procurement/master/additional-costs',
            '/api/procurement/master/pph',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
            $response->assertJsonStructure(['data', 'meta']);
        }
    }

    /**
     * Test Exim Master APIs.
     */
    public function test_exim_master_apis(): void
    {
        $endpoints = [
            '/api/exim/master/units',
            '/api/exim/master/unit-references',
            '/api/exim/master/items',
            '/api/exim/master/brands',
            '/api/exim/master/classifications',
            '/api/exim/master/departments',
            '/api/exim/master/facilities',
            '/api/exim/master/hs-codes',
            '/api/exim/master/categories',
            '/api/exim/master/styles',
            '/api/exim/master/colours',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
            $response->assertJsonStructure(['data']);
        }
    }

    /**
     * Test Exim Operations & Warehouse Master APIs.
     */
    public function test_exim_operations_and_warehouse_master_apis(): void
    {
        $endpoints = [
            '/api/exim/operations/returns',
            '/api/exim/operations/document-histories',
            '/api/warehouse/master/warehouses',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
            $response->assertJsonStructure(['data', 'meta']);
        }
    }

    /**
     * Test Core Transactional APIs (PR, PO, RN, BPB, Traceability).
     */
    public function test_core_transactional_apis(): void
    {
        $endpoints = [
            '/api/procurement/pr',
            '/api/procurement/po',
            '/api/warehouse/bpb',
            '/api/warehouse/rn',
            '/api/reporting/traceability',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
        }
    }
}
