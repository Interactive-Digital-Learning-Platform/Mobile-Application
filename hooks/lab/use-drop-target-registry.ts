import { useRef } from "react";
import { View } from "react-native";

// Registry of drop-target (equipment) refs, measured in screen coordinates so drags from
// anywhere on screen (including the chemical drawer overlay) can hit-test against them.
export const useDropTargetRegistry = () => {
  const refs = useRef<Record<string, View | null>>({});

  const register = (id: string) => (node: View | null) => {
    refs.current[id] = node;
  };

  const resolveDropTarget = (absoluteX: number, absoluteY: number): Promise<string | null> => {
    const ids = Object.keys(refs.current);
    return new Promise((resolve) => {
      if (ids.length === 0) return resolve(null);
      let remaining = ids.length;
      let match: string | null = null;

      ids.forEach((id) => {
        const node = refs.current[id];
        if (!node) {
          remaining -= 1;
          if (remaining === 0) resolve(match);
          return;
        }
        node.measure((_x, _y, width, height, pageX, pageY) => {
          if (
            absoluteX >= pageX &&
            absoluteX <= pageX + width &&
            absoluteY >= pageY &&
            absoluteY <= pageY + height
          ) {
            match = id;
          }
          remaining -= 1;
          if (remaining === 0) resolve(match);
        });
      });
    });
  };

  return { register, resolveDropTarget };
};
