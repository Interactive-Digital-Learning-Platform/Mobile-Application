import { useRef } from "react";
import { View } from "react-native";

// Registry of drop-target (equipment) refs, measured in screen coordinates so drags from
// anywhere on screen (including the chemical drawer overlay) can hit-test against them.
export const useDropTargetRegistry = () => {
  const refs = useRef<Record<string, View | null>>({});

  const register = (id: string) => (node: View | null) => {
    refs.current[id] = node;
  };

  // Resolves which registered target sits under (absoluteX, absoluteY).
  //
  // `excludeId` — skip this id entirely. A dragged bench item registers itself as a drop target
  // (so bottles can be dropped onto it), which means the item's own node is ALWAYS under its
  // release point; without excluding it, a dropper released onto a test tube would sometimes
  // resolve to itself and the transfer would silently no-op. Callers dragging a registered item
  // must pass its id here.
  //
  // When several targets overlap the point, the result is deterministic: the one whose centre is
  // nearest the point (what the student aimed at), tie-broken by smallest area. Nodes that
  // measure to a zero rect (not laid out yet / detached) are ignored — another source of the
  // "sometimes it works" flakiness.
  const resolveDropTarget = (
    absoluteX: number,
    absoluteY: number,
    excludeId?: string,
  ): Promise<string | null> => {
    const ids = Object.keys(refs.current).filter((id) => id !== excludeId);
    return new Promise((resolve) => {
      if (ids.length === 0) return resolve(null);
      let remaining = ids.length;
      let settled = false;
      const hits: { id: string; dist: number; area: number }[] = [];

      const done = () => {
        if (settled) return;
        settled = true;
        if (hits.length === 0) return resolve(null);
        hits.sort((a, b) => a.dist - b.dist || a.area - b.area);
        resolve(hits[0].id);
      };
      // Defensive: if a node's measure() never calls back (detached mid-drag), resolve with
      // whatever hits we have rather than hanging the drop forever.
      setTimeout(done, 200);

      ids.forEach((id) => {
        const node = refs.current[id];
        if (!node) {
          remaining -= 1;
          if (remaining === 0) done();
          return;
        }
        node.measure((_x, _y, width, height, pageX, pageY) => {
          if (
            width > 0 &&
            height > 0 &&
            absoluteX >= pageX &&
            absoluteX <= pageX + width &&
            absoluteY >= pageY &&
            absoluteY <= pageY + height
          ) {
            const cx = pageX + width / 2;
            const cy = pageY + height / 2;
            hits.push({ id, dist: (cx - absoluteX) ** 2 + (cy - absoluteY) ** 2, area: width * height });
          }
          remaining -= 1;
          if (remaining === 0) done();
        });
      });
    });
  };

  return { register, resolveDropTarget };
};
