import { ReactionEducationalInfo } from "./chemical.types";

// --- Compound Builder domain types ---

export type CompoundBuildParticipantType = {
  chemicalId: string;
  name: string;
  symbol: string;
  color: string;
};

export type CompoundBuildTemplateType = {
  compound: { _id: string; name: string; symbol: string; formula: string | null; color: string };
  reactants: CompoundBuildParticipantType[];
  products: CompoundBuildParticipantType[];
  coefficientOptions: number[];
};

export type CompoundBuildRequestType = {
  compoundId: string;
  reactantCoefficients: { chemicalId: string; coefficient: number }[];
  productCoefficient: number;
};

export type CompoundBuildResultType =
  | {
      correct: true;
      attempts: number;
      compound: { name: string; symbol: string };
      balancedEquation: string;
      educationalInfo: ReactionEducationalInfo;
    }
  | { correct: false; attempts: number; hint: string };
