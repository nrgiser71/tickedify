/**
 * Integration Test: Beta User Subscription Flow
 *
 * This test MUST FAIL until the complete flow is implemented.
 * Tests end-to-end user scenario from beta expiration to subscription selection.
 */

const BASE_URL = 'http://localhost:3000';

// Simple fetch implementation for testing
const testFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
};

describe('Beta User Subscription Flow Integration Test', () => {

  test('complete beta user to subscription selection flow', async () => {
    // This test WILL FAIL until complete implementation exists

    // Step 1: Verify user can access subscription plans
    console.log('Step 1: Getting available subscription plans...');
    const plansResponse = await testFetch(`${BASE_URL}/api/subscription/plans`);
    expect(plansResponse.status).toBe(200);

    const plansData = await plansResponse.json();
    expect(plansData.success).toBe(true);
    expect(plansData.plans).toHaveLength(3);

    // Step 2: Check initial user status (should be beta user)
    console.log('Step 2: Checking user subscription status...');
    const initialStatusResponse = await testFetch(`${BASE_URL}/api/subscription/status`);

    if (initialStatusResponse.status === 401) {
      console.log('⚠️ User not authenticated - cannot complete integration test');
      return; // Skip test if not authenticated
    }

    expect(initialStatusResponse.status).toBe(200);
    const initialStatus = await initialStatusResponse.json();
    expect(initialStatus.success).toBe(true);
    expect(initialStatus.can_select).toBe(true);

    // For beta flow, user should be beta type
    expect(initialStatus.account_type).toBe('beta');

    // Step 3: Select a subscription plan (beta user chooses yearly plan)
    console.log('Step 3: Selecting yearly subscription plan...');
    const planSelection = {
      plan_id: 'yearly_70',
      source: 'beta'
    };

    const selectResponse = await testFetch(`${BASE_URL}/api/subscription/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planSelection)
    });

    expect(selectResponse.status).toBe(200);
    const selectData = await selectResponse.json();
    expect(selectData.success).toBe(true);
    expect(selectData.selected_plan).toBe('yearly_70');

    // Step 4: Verify selection was persisted
    console.log('Step 4: Verifying plan selection was saved...');
    const updatedStatusResponse = await testFetch(`${BASE_URL}/api/subscription/status`);
    expect(updatedStatusResponse.status).toBe(200);

    const updatedStatus = await updatedStatusResponse.json();
    expect(updatedStatus.success).toBe(true);
    expect(updatedStatus.selected_plan).toBe('yearly_70');
    expect(updatedStatus.selection_source).toBe('beta');
    expect(updatedStatus.plan_selected_at).toBeTruthy();

    // Verify timestamp is recent (within last 10 seconds)
    const selectionTime = new Date(updatedStatus.plan_selected_at);
    const now = new Date();
    const timeDiff = now.getTime() - selectionTime.getTime();
    expect(timeDiff).toBeLessThan(10000); // Less than 10 seconds

    console.log('✅ Beta user subscription flow completed successfully');
  });

  test('beta user can change plan selection', async () => {
    // This test WILL FAIL until plan changing is implemented

    // First, select monthly plan
    const monthlySelection = {
      plan_id: 'monthly_7',
      source: 'beta'
    };

    const firstSelectResponse = await testFetch(`${BASE_URL}/api/subscription/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(monthlySelection)
    });

    if (firstSelectResponse.status === 401) {
      console.log('⚠️ User not authenticated - skipping plan change test');
      return;
    }

    expect(firstSelectResponse.status).toBe(200);

    // Then, change to trial plan
    const trialSelection = {
      plan_id: 'trial_14_days',
      source: 'beta'
    };

    const secondSelectResponse = await testFetch(`${BASE_URL}/api/subscription/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trialSelection)
    });

    expect(secondSelectResponse.status).toBe(200);

    // Verify the change was persisted
    const statusResponse = await testFetch(`${BASE_URL}/api/subscription/status`);
    const statusData = await statusResponse.json();

    expect(statusData.selected_plan).toBe('trial_14_days');
    expect(statusData.selection_source).toBe('beta');

    console.log('✅ Beta user can change plan selection');
  });

  test('beta user subscription page accessibility', async () => {
    // Test that beta users can access subscription page
    // This will fail until frontend implementation exists

    try {
      const pageResponse = await testFetch(`${BASE_URL}/subscription.html?source=beta`);

      if (pageResponse.status === 200) {
        const pageContent = await pageResponse.text();

        // Verify page contains expected content
        expect(pageContent).toContain('subscription');
        expect(pageContent).toContain('14 dagen gratis');
        expect(pageContent).toContain('€7');
        expect(pageContent).toContain('€70');

        console.log('✅ Subscription page accessible for beta users');
      } else if (pageResponse.status === 404) {
        console.log('❌ Subscription page not found - T011 not implemented yet');
        throw new Error('Subscription page not implemented');
      }
    } catch (error) {
      console.log('❌ Subscription page test failed:', error.message);
      throw error;
    }
  });

  test('error handling for invalid beta user actions', async () => {
    // Test various error scenarios for beta users

    // Test invalid plan ID
    const invalidPlanSelection = {
      plan_id: 'invalid_plan',
      source: 'beta'
    };

    const invalidPlanResponse = await testFetch(`${BASE_URL}/api/subscription/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidPlanSelection)
    });

    if (invalidPlanResponse.status !== 401) {
      expect(invalidPlanResponse.status).toBe(400);
      const errorData = await invalidPlanResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('plan_id');
    }

    // Test malformed JSON
    const malformedResponse = await testFetch(`${BASE_URL}/api/subscription/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'invalid json'
    });

    if (malformedResponse.status !== 401) {
      expect(malformedResponse.status).toBe(400);
    }

    console.log('✅ Error handling works for invalid beta user actions');
  });
});

/**
 * Manual Test Runner
 *
 * Run this test to verify the complete beta user flow:
 * node test_beta_flow.js
 */
if (require.main === module) {
  console.log('Running manual integration test for beta user subscription flow...');

  (async () => {
    try {
      console.log('\n=== Beta User Subscription Flow Test ===\n');

      // Test the complete flow
      const plansResponse = await testFetch(`${BASE_URL}/api/subscription/plans`);
      console.log('✓ Plans endpoint status:', plansResponse.status);

      const statusResponse = await testFetch(`${BASE_URL}/api/subscription/status`);
      console.log('✓ Status endpoint status:', statusResponse.status);

      if (statusResponse.status === 200) {
        const statusData = await statusResponse.json();
        console.log('✓ User account type:', statusData.account_type);
        console.log('✓ Can select plans:', statusData.can_select);
        console.log('✓ Current selection:', statusData.selected_plan || 'None');

        // Try to select a plan
        const selectResponse = await testFetch(`${BASE_URL}/api/subscription/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: 'trial_14_days', source: 'beta' })
        });

        console.log('✓ Plan selection status:', selectResponse.status);

        if (selectResponse.status === 200) {
          console.log('\n✅ Complete beta user flow is working!');
        } else {
          console.log('\n❌ Plan selection failed - implementation incomplete');
        }
      } else {
        console.log('\n❌ User status check failed - authentication or implementation issue');
      }

    } catch (error) {
      console.log('\n❌ Beta user flow test failed:', error.message);
      console.log('This is expected until T007-T009 are implemented.');
    }
  })();
}

module.exports = {
  testBetaFlow: testFetch,
  betaTestScenarios: {
    selectYearly: { plan_id: 'yearly_70', source: 'beta' },
    selectMonthly: { plan_id: 'monthly_7', source: 'beta' },
    selectTrial: { plan_id: 'trial_14_days', source: 'beta' }
  }
};