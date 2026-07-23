import test from 'node:test';
import assert from 'node:assert/strict';
import { getChartAccess } from '../src/utils/chartAccess.js';

const baseChart = {
  owner_id: 'owner-1',
  is_public: false,
  public_access_level: 'view',
  chart_shares: [],
};

test('owners can view and edit private charts', () => {
  assert.deepEqual(getChartAccess(baseChart, { id: 'owner-1', email: 'owner@gdt.gov.kh' }), {
    canView: true,
    canEdit: true,
    isOwner: true,
    acceptedShare: null,
  });
});

test('public view charts are read-only for visitors', () => {
  const access = getChartAccess({ ...baseChart, is_public: true }, null);
  assert.equal(access.canView, true);
  assert.equal(access.canEdit, false);
});

test('public edit charts are editable for visitors', () => {
  const access = getChartAccess(
    { ...baseChart, is_public: true, public_access_level: 'edit' },
    null,
  );
  assert.equal(access.canView, true);
  assert.equal(access.canEdit, true);
});

test('pending invitations do not grant access', () => {
  const chart = {
    ...baseChart,
    chart_shares: [{
      shared_email: 'USER@GDT.GOV.KH',
      access_level: 'edit',
      status: 'pending',
    }],
  };
  const access = getChartAccess(chart, { id: 'user-1', email: 'user@gdt.gov.kh' });
  assert.equal(access.canView, false);
  assert.equal(access.canEdit, false);
});

test('accepted email matching is case-insensitive', () => {
  const chart = {
    ...baseChart,
    chart_shares: [{
      shared_email: 'USER@GDT.GOV.KH',
      access_level: 'edit',
      status: 'accepted',
    }],
  };
  const access = getChartAccess(chart, { id: 'user-1', email: 'user@gdt.gov.kh' });
  assert.equal(access.canView, true);
  assert.equal(access.canEdit, true);
});
