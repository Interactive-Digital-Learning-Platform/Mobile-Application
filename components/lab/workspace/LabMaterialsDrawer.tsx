import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Check, ChevronDown, Droplet, Hammer, Plus, Search, X } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ChemicalType } from "@/types/lab";
import ChemicalBottle from "@/components/lab/chemicals/ChemicalBottle";
import MaterialArtwork, { displaySymbol } from "@/components/lab/chemicals/MaterialArtwork";

type Props = {
  // What's physically available in the lab right now (LabRun.materials → chemicals).
  onHand: ChemicalType[];
  // The full supported chemistry catalog — what the in-lab Material Library shows. NOT filtered
  // to the practical's requirements (that would reveal the answer — spec §2 / §17).
  catalog: ChemicalType[];
  // Compound ids the student has already finished building (session.builtCompounds) — a buildable
  // compound not in this set must be built before it can be brought into the lab.
  builtCompoundIds: string[];
  busy?: boolean;
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onDropChemical: (chemical: ChemicalType, instanceId: string) => void;
  onInspectChemical: (chemical: ChemicalType) => void;
  onHoverChange: (instanceId: string | null) => void;
  // Pull a catalog chemical into the live lab (add_material_to_lab).
  onAddMaterial: (chemicalId: string) => void;
  // A buildable compound the student hasn't built yet — hand off to the Compound Builder.
  onBuildCompound: (chemical: ChemicalType) => void;
  // Bumped by the parent (e.g. from the Hint Center's "Open Material Library" button) to open the
  // Library modal from outside. Any change to a truthy value opens it.
  openLibrarySignal?: number;
};

const FILTERS = ["All", "Elements", "Compounds", "Buildable"] as const;
type Filter = (typeof FILTERS)[number];

const norm = (s: string) => s.toLowerCase().trim();

// Compact catalog card for the Material Library — deliberately carries NO "required for this task"
// signal (spec §17). Selected = queued to add; already-on-hand = shown as a non-interactive check.
function LibraryCard({
  item,
  selected,
  onHand,
  needsBuild,
  onPress,
}: {
  item: ChemicalType;
  selected: boolean;
  onHand: boolean;
  needsBuild: boolean;
  onPress: () => void;
}) {
  const active = selected || onHand;
  return (
    <Pressable
      onPress={onPress}
      disabled={onHand}
      style={{
        width: "48%",
        borderRadius: 14,
        borderWidth: active ? 2 : 1,
        borderColor: onHand ? "#10B981" : selected ? "#F97316" : "#E2E8F0",
        backgroundColor: onHand ? "#ECFDF5" : selected ? "#FFF7ED" : "#FFFFFF",
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: "center",
        opacity: onHand ? 0.85 : 1,
      }}
    >
      {(selected || onHand) && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: onHand ? "#10B981" : "#F97316",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={11} color="#fff" strokeWidth={3} />
        </View>
      )}
      <View style={{ height: 56, alignItems: "center", justifyContent: "center" }}>
        <MaterialArtwork chemical={item} size={52} />
      </View>
      <Text className="text-[11px] font-bold text-center text-slate-700 mt-1.5" numberOfLines={2} style={{ minHeight: 28, lineHeight: 14 }}>
        {item.name}
      </Text>
      <Text className="text-[10px] font-semibold text-center text-slate-400">{displaySymbol(item)}</Text>
      {needsBuild && (
        <View className="flex-row items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-primary/10">
          <Hammer size={9} color={ICON_COLORS.primary500} strokeWidth={2.5} />
          <Text className="text-[9px] font-bold text-primary">Build first</Text>
        </View>
      )}
    </Pressable>
  );
}

// Replaces the permanent left sidebar. Collapsed = a floating pill with the on-hand count; open =
// a bottom sheet listing the materials currently in the lab (drag them straight up onto a bench
// container) plus a "+ Add Materials" button that opens the full Chemistry Material Library. The
// student can bring in a material they didn't select before entering the lab WITHOUT leaving the
// workspace or restarting anything (spec §6–§9).
export default function LabMaterialsDrawer({
  onHand,
  catalog,
  builtCompoundIds,
  busy,
  resolveDropTarget,
  onDropChemical,
  onInspectChemical,
  onHoverChange,
  onAddMaterial,
  onBuildCompound,
  openLibrarySignal,
}: Props) {
  const [open, setOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [queued, setQueued] = useState<string[]>([]);

  // Open the Library modal on an external signal (Hint Center "Open Material Library" button).
  useEffect(() => {
    if (openLibrarySignal) {
      setOpen(true);
      setLibraryOpen(true);
    }
  }, [openLibrarySignal]);

  const onHandIds = useMemo(() => new Set(onHand.map((c) => c._id)), [onHand]);

  const filtered = useMemo(() => {
    const q = norm(search);
    return (catalog || []).filter((c) => {
      if (filter === "Elements" && c.chemicalType !== "element") return false;
      if (filter === "Compounds" && c.chemicalType !== "compound") return false;
      if (filter === "Buildable" && !c.isBuildableFromElements) return false;
      if (!q) return true;
      return (
        norm(c.name).includes(q) ||
        norm(c.symbol).includes(q) ||
        (c.formula ? norm(c.formula).includes(q) : false)
      );
    });
  }, [catalog, search, filter]);

  const elements = filtered.filter((c) => c.chemicalType === "element");
  const compounds = filtered.filter((c) => c.chemicalType === "compound");

  const closeLibrary = () => {
    setLibraryOpen(false);
    setQueued([]);
    setSearch("");
    setFilter("All");
  };

  const handleCardPress = (item: ChemicalType) => {
    const needsBuild = !!item.isBuildableFromElements && !builtCompoundIds.includes(item._id) && !onHandIds.has(item._id);
    if (needsBuild) {
      closeLibrary();
      setOpen(false);
      onBuildCompound(item);
      return;
    }
    setQueued((prev) => (prev.includes(item._id) ? prev.filter((id) => id !== item._id) : [...prev, item._id]));
  };

  const confirmAdd = () => {
    queued.forEach((id) => onAddMaterial(id));
    closeLibrary();
    setOpen(false);
  };

  const renderCard = (item: ChemicalType) => {
    const needsBuild = !!item.isBuildableFromElements && !builtCompoundIds.includes(item._id) && !onHandIds.has(item._id);
    return (
      <LibraryCard
        key={item._id}
        item={item}
        selected={queued.includes(item._id)}
        onHand={onHandIds.has(item._id)}
        needsBuild={needsBuild}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  return (
    <>
      {!open && (
        <TouchableOpacity
          onPress={() => setOpen(true)}
          activeOpacity={0.85}
          className="absolute flex-row items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200"
          style={{ left: 12, bottom: 12, shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}
        >
          <Droplet size={15} color={ICON_COLORS.primary500} strokeWidth={2} />
          <Text className="text-[12px] font-bold text-slate-700">Materials</Text>
          <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
            <Text className="text-white font-bold" style={{ fontSize: 10 }}>{onHand.length}</Text>
          </View>
        </TouchableOpacity>
      )}

      {open && (
        <>
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            <Pressable className="flex-1" style={{ backgroundColor: "rgba(15,23,42,0.28)" }} onPress={() => setOpen(false)} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(220)}
            exiting={SlideOutDown.duration(180)}
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl px-4 pt-3 pb-4"
            style={{ maxHeight: "64%" }}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Materials · On Hand</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <ChevronDown size={18} color={ICON_COLORS.slate400} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text className="text-[11px] text-slate-400 mb-2">Drag a material up onto a container on the bench.</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
              <View className="flex-row flex-wrap">
                {onHand.map((c) => (
                  <View key={c._id} style={{ width: "25%", alignItems: "center", marginBottom: 12 }}>
                    <ChemicalBottle
                      chemical={c}
                      resolveDropTarget={resolveDropTarget}
                      onDropped={(chemical, instanceId) => {
                        onDropChemical(chemical, instanceId);
                        setOpen(false);
                      }}
                      onInspect={onInspectChemical}
                      onHoverChange={onHoverChange}
                    />
                  </View>
                ))}
                {onHand.length === 0 && (
                  <Text className="text-[12px] text-slate-400 py-3">
                    Nothing in your lab yet — use “Add Materials” to bring something in.
                  </Text>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setLibraryOpen(true)}
              activeOpacity={0.85}
              className="mt-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/30"
            >
              <Plus size={16} color={ICON_COLORS.primary500} strokeWidth={2.5} />
              <Text className="text-[13px] font-bold text-primary">Add Materials</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      <Modal visible={libraryOpen} animationType="slide" transparent onRequestClose={closeLibrary}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center gap-3 px-4 pt-14 pb-3 border-b border-slate-100">
            <TouchableOpacity onPress={closeLibrary} hitSlop={8} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
              <X size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">Chemistry Material Library</Text>
              <Text className="text-base font-black text-slate-800">Add Materials</Text>
            </View>
          </View>

          <View className="px-4 pt-3 pb-2">
            <View className="flex-row items-center gap-2 px-3.5 rounded-xl bg-slate-100">
              <Search size={15} color={ICON_COLORS.slate400} strokeWidth={2} />
              <TextInput
                className="flex-1 py-2.5 text-[14px] text-slate-800"
                placeholder="Search materials…"
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="flex-row gap-2 mt-2.5">
              {FILTERS.map((f) => {
                const activeF = filter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-xl border ${activeF ? "border-primary bg-primary/10" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-xs font-semibold ${activeF ? "text-primary" : "text-slate-600"}`}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Text className="text-[11px] text-slate-400 leading-4 mb-3">
              Bring in whatever you think this task needs. Your first choices are still recorded — adding
              here just lets you keep going.
            </Text>

            {elements.length > 0 && (filter === "All" || filter === "Elements") && (
              <View className="mb-4">
                <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Elements</Text>
                <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
                  {elements.map(renderCard)}
                </View>
              </View>
            )}

            {compounds.length > 0 && filter !== "Elements" && (
              <View className="mb-4">
                <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                  {filter === "Buildable" ? "Buildable compounds" : "Compounds"}
                </Text>
                <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
                  {compounds.map(renderCard)}
                </View>
              </View>
            )}

            {elements.length === 0 && compounds.length === 0 && (
              <Text className="text-[13px] text-slate-400 text-center py-16">Nothing matches your search.</Text>
            )}
          </ScrollView>

          <View className="border-t border-slate-100 px-4 pt-3 pb-8">
            <TouchableOpacity
              disabled={queued.length === 0 || busy}
              onPress={confirmAdd}
              activeOpacity={0.85}
              className={`py-3.5 rounded-xl items-center ${queued.length > 0 && !busy ? "bg-primary" : "bg-slate-200"}`}
            >
              <Text className={`text-[15px] font-bold ${queued.length > 0 && !busy ? "text-white" : "text-slate-400"}`}>
                {queued.length === 0 ? "Select materials to add" : `Add ${queued.length} material${queued.length > 1 ? "s" : ""} to lab`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
