import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NIGERIAN_STATES,
  PAYSTACK_NGN_MINIMUM,
  canonicalNigeriaState,
  deliveryFeeForState,
  deliveryZoneForState,
} from './delivery.js';

test('offers all 36 Nigerian states plus FCT exactly once', () => {
  assert.equal(NIGERIAN_STATES.length, 37);
  assert.equal(new Set(NIGERIAN_STATES).size, 37);
  assert.equal(NIGERIAN_STATES.includes('FCT'), true);
  assert.equal(NIGERIAN_STATES.includes('Lagos'), true);
});

test('normalizes legacy Abuja names to FCT', () => {
  assert.equal(canonicalNigeriaState('Abuja'), 'FCT');
  assert.equal(canonicalNigeriaState('Federal Capital Territory'), 'FCT');
  assert.equal(canonicalNigeriaState('fct'), 'FCT');
});

test('prices FCT and every other valid state into two delivery zones', () => {
  assert.equal(deliveryZoneForState('FCT'), 'fct');
  assert.equal(deliveryFeeForState('FCT'), 5500);
  for (const state of NIGERIAN_STATES.filter((candidate) => candidate !== 'FCT')) {
    assert.equal(deliveryZoneForState(state), 'outside_fct');
    assert.equal(deliveryFeeForState(state), 14000);
  }
  assert.equal(deliveryZoneForState('Not a state'), '');
});

test('uses Paystack’s NGN minimum for the test-only delivery rate', () => {
  assert.equal(PAYSTACK_NGN_MINIMUM, 50);
});
