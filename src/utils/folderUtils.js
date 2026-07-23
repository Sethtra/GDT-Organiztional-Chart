export function getFolderAncestors(folderId, allFolders) {
  if (!folderId || !allFolders?.length) return [];

  const map = new Map(allFolders.map((folder) => [folder.id, folder]));
  const visited = new Set();
  const chain = [];
  let current = map.get(folderId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : null;
  }

  return chain;
}
