// Extra "Observe" copy for the equipment-selection screen's sheet — conceptual orientation only.
// Deliberately practical-agnostic: nothing here says (or hints) whether an item belongs in the
// current experiment. Keyed by EquipmentCatalogItem.key; items with no entry fall back to the
// one-line `description` from equipment.constants.ts.
export type EquipmentObserveDetail = {
  whatIsIt: string;
  commonUses: string[];
  thinkPrompt: string;
};

export const EQUIPMENT_OBSERVE_DETAIL: Record<string, EquipmentObserveDetail> = {
  beaker: {
    whatIsIt: "A wide glass container with a pouring lip. Its volume markings are rough guides, not precise measurements.",
    commonUses: ["Holding and mixing liquids", "Heating a solution", "Estimating a volume roughly"],
    thinkPrompt: "If you needed an exact volume, would a beaker be the best choice?",
  },
  test_tube: {
    whatIsIt: "A small, narrow tube for working with very small amounts of a substance.",
    commonUses: ["Observing a reaction on a small scale", "Heating a small sample", "Mixing a few millilitres of liquid"],
    thinkPrompt: "Why might a small container be safer for an unfamiliar reaction?",
  },
  measuring_cylinder: {
    whatIsIt: "A tall, narrow container with fine markings for measuring the volume of a liquid.",
    commonUses: ["Measuring a set volume of liquid", "Checking how much liquid you have", "Measuring volume by displacement"],
    thinkPrompt: "What makes its reading more accurate than a beaker's markings?",
  },
  dropper: {
    whatIsIt: "A small tube with a rubber bulb that releases liquid one drop at a time.",
    commonUses: ["Adding an indicator drop by drop", "Adding a reactant slowly", "Transferring very small amounts"],
    thinkPrompt: "When would adding liquid slowly, drop by drop, actually matter?",
  },
  burette: {
    whatIsIt: "A long graduated tube with a tap at the bottom that delivers an adjustable, precise volume of liquid.",
    commonUses: ["Titration", "Adding a measured volume gradually", "Reading exactly how much liquid was added"],
    thinkPrompt: "Why is being able to stop the flow instantly useful?",
  },
  pipette: {
    whatIsIt: "A slender tube that draws up and delivers one fixed, accurately known volume of liquid.",
    commonUses: ["Transferring an exact volume", "Preparing a sample for titration", "Moving liquid without spilling"],
    thinkPrompt: "How is a pipette different from a measuring cylinder?",
  },
  flask: {
    whatIsIt: "A container with a rounded body and a narrow neck. The neck reduces splashing and evaporation.",
    commonUses: ["Mixing by swirling", "Heating a liquid", "Collecting a solution during titration"],
    thinkPrompt: "Why does a narrow neck help when you swirl the contents?",
  },
  thermometer: {
    whatIsIt: "An instrument that measures how hot or cold a substance is.",
    commonUses: ["Tracking temperature during a reaction", "Checking a target temperature is reached", "Measuring a temperature change"],
    thinkPrompt: "What could a rising temperature tell you about a reaction?",
  },
  burner: {
    whatIsIt: "A device that produces a steady, adjustable flame to heat equipment placed above it.",
    commonUses: ["Heating a solution", "Speeding up a slow reaction", "Boiling off a liquid"],
    thinkPrompt: "Does every reaction need heat to get started?",
  },
  stirrer: {
    whatIsIt: "A rod used to mix a solution by hand so it combines evenly.",
    commonUses: ["Dissolving a solid", "Keeping a mixture uniform", "Helping two liquids combine"],
    thinkPrompt: "How could stirring change how quickly something dissolves?",
  },
  ph_meter: {
    whatIsIt: "An electronic instrument that gives a precise numerical reading of how acidic or basic a solution is.",
    commonUses: ["Measuring pH accurately", "Comparing the acidity of solutions", "Checking a solution is neutral"],
    thinkPrompt: "When would a number be more useful than an indicator's colour?",
  },
  balance: {
    whatIsIt: "An instrument that measures the mass of a solid.",
    commonUses: ["Weighing out a solid reactant", "Finding the mass of an object", "Measuring a change in mass"],
    thinkPrompt: "Why might you measure mass before and after a reaction?",
  },
};
