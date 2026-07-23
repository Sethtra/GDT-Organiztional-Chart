function stableJson(value) {
  return JSON.stringify(value ?? []);
}

export function shouldOfferLocalRecovery(serverChart, localBackup) {
  if (!serverChart || !localBackup?.timestamp) return false;

  const serverTime = serverChart.updated_at
    ? new Date(serverChart.updated_at).getTime()
    : 0;
  if (Number.isFinite(serverTime) && serverTime >= localBackup.timestamp) {
    return false;
  }

  return (
    stableJson(serverChart.nodes) !== stableJson(localBackup.nodes) ||
    stableJson(serverChart.edges) !== stableJson(localBackup.edges)
  );
}
