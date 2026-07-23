function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function getChartAccess(chart, user) {
  if (!chart) {
    return { canView: false, canEdit: false, isOwner: false, acceptedShare: null };
  }

  const isOwner = !!user?.id && chart.owner_id === user.id;
  const userEmail = normalizeEmail(user?.email);
  const acceptedShare = userEmail
    ? (chart.chart_shares || []).find(
        (share) =>
          normalizeEmail(share.shared_email) === userEmail &&
          share.status !== 'pending',
      ) || null
    : null;

  const canView = isOwner || !!chart.is_public || !!acceptedShare;
  const canEdit =
    isOwner ||
    (!!chart.is_public && chart.public_access_level === 'edit') ||
    acceptedShare?.access_level === 'edit';

  return { canView, canEdit, isOwner, acceptedShare };
}
