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
  color: string;
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
