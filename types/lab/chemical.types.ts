// --- Lab domain types: chemicals & reactions ---

export type ChemicalCategory =
  | "acid" | "base" | "salt" | "metal" | "non-metal" | "metalloid" | "indicator" | "gas" | "organic" | "oxide";

export type ChemicalState = "solid" | "liquid" | "gas" | "aqueous";

export type SafetyClassification = "safe" | "caution" | "hazardous" | "corrosive" | "flammable" | "toxic";

// "element" = a raw first-20-syllabus-or-not element; "compound" = a substance made of multiple
// elements, either handed to the student ready-made or (if isBuildableFromElements) constructible
// via the Compound Builder from elements with atomicNumber <= 20.
export type ChemicalKind = "element" | "compound";

export type ChemicalType = {
  _id: string;
  name: string;
  symbol: string;
  formula: string | null;
  atomicNumber?: number | null;
  atomicMass?: number | null;
  group?: number | null;
  period?: number | null;
  electronConfiguration?: string | null;
  valency?: number | null;
  category: ChemicalCategory;
  chemicalType: ChemicalKind;
  isBuildableFromElements?: boolean;
  state: ChemicalState;
  // CARD / bottle-tint artwork colour only — NOT how the substance looks as the liquid in a
  // vessel. For that, use `appearance` (data-driven, from the backend) via
  // resolveLiquidAppearance() — never read `color` for bench liquid rendering.
  color: string;
  // How the material actually looks as the substance in a test tube / beaker. Backend-authored
  // (src/data/chemicalAppearance.js). Absent only on a legacy chemical not yet migrated — callers
  // fall back to a category/state guess.
  appearance?: {
    solutionColor?: string | null;
    opacity?: number | null;
    phase?: "solution" | "liquid" | "solid" | "gas" | "powder" | "crystals" | "metal" | null;
    texture?: "clear" | "cloudy" | "opaque" | "metallic" | "granular" | null;
  } | null;
  concentration?: string | null;
  phValue?: number | null;
  safetyClassification: SafetyClassification;
  hazardInfo: string[];
  commonUses: string[];
  iconKey?: string | null;
  // Remote artwork URL for the element/compound illustration. Populated by a later backend media
  // phase; the material card and Observe sheet fall back to a symbol tile / reagent-bottle
  // rendering until then. Storage-agnostic — the API returns a plain URL regardless of where the
  // binary actually lives (MinIO now, S3/Cloudinary later).
  imageUrl?: string | null;
};

export type ReactionEducationalInfo = {
  electronConfiguration?: string | null;
  lewisStructureDescription?: string | null;
  molecularGeometry?: string | null;
  bondType?: "ionic" | "covalent" | "polar covalent" | "metallic" | null;
  explanation: string;
};

export type ReactionObservableChanges = {
  colorChange: { from: string | null; to: string | null };
  gasProduced: boolean;
  gasName?: string | null;
  precipitateFormed: boolean;
  precipitateColor?: string | null;
  heatProduced: boolean;
  energyChange: "exothermic" | "endothermic" | "none";
};

export type ReactionResultType = {
  found: true;
  reaction: {
    id: string;
    name: string;
    balancedEquation: string;
    reactionType: string;
    products: { chemical: ChemicalType; coefficient: number }[];
    observableChanges: ReactionObservableChanges;
    educationalInfo: ReactionEducationalInfo;
    safetyNotes: string[];
  };
} | {
  found: false;
  reason: string;
  explanation?: string | null;
  hint?: string | null;
};
