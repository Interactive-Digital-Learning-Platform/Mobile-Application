export interface StudyMapNode {
  id: string;
  label: string;
  children: StudyMapNode[];
}

/** Saved AI trees are untrusted. Bound recursion and skip malformed branches. */
export function prepareMindMap(value: unknown): {
  root: StudyMapNode | null;
  simplified: boolean;
} {
  let count = 0;
  let attempts = 0;
  let simplified = false;
  const ancestors = new Set<object>();
  function visit(
    input: unknown,
    id: string,
    depth: number,
  ): StudyMapNode | null {
    if (++attempts > 400) {
      simplified = true;
      return null;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      simplified = true;
      return null;
    }
    const raw = input as Record<string, unknown>;
    if (typeof raw.label !== "string" || !raw.label.trim()) {
      simplified = true;
      return null;
    }
    if (depth > 8 || count >= 200 || ancestors.has(input)) {
      simplified = true;
      return null;
    }
    count++;
    ancestors.add(input);
    const children: StudyMapNode[] = [];
    if (Array.isArray(raw.children)) {
      for (let i = 0; i < raw.children.length; i++) {
        if (count >= 200 || attempts >= 400) {
          simplified = true;
          break;
        }
        const child = visit(raw.children[i], `${id}.${i}`, depth + 1);
        if (child) children.push(child);
      }
    } else if (raw.children != null) simplified = true;
    ancestors.delete(input);
    const label = raw.label.trim();
    if (label.length > 3000) simplified = true;
    return { id, label: label.slice(0, 3000), children };
  }
  return { root: visit(value, "root", 0), simplified };
}

export function mindMapNodes(root: StudyMapNode): StudyMapNode[] {
  return [root, ...root.children.flatMap(mindMapNodes)];
}

/** Preserve ancestors and stable IDs so a matching fact keeps its context. */
export function searchMindMap(
  root: StudyMapNode,
  query: string,
): StudyMapNode | null {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle || root.label.toLocaleLowerCase().includes(needle)) return root;
  const children = root.children
    .map((child) => searchMindMap(child, needle))
    .filter((child): child is StudyMapNode => child !== null);
  return children.length ? { ...root, children } : null;
}
