import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── Units of Measure ───────────────────────────────────────────────────────
  const uoms = [
    { name: "Board Feet", abbreviation: "bf", isDecimal: true },
    { name: "Linear Feet", abbreviation: "lf", isDecimal: true },
    { name: "Square Feet", abbreviation: "sqft", isDecimal: true },
    { name: "Piece", abbreviation: "pc", isDecimal: false },
    { name: "Sheet", abbreviation: "sh", isDecimal: false },
    { name: "Gallon", abbreviation: "gal", isDecimal: true },
    { name: "Quart", abbreviation: "qt", isDecimal: true },
    { name: "Pound", abbreviation: "lb", isDecimal: true },
    { name: "Ounce", abbreviation: "oz", isDecimal: true },
    { name: "Box", abbreviation: "bx", isDecimal: false },
    { name: "Roll", abbreviation: "rl", isDecimal: false },
  ];

  for (const uom of uoms) {
    await prisma.unitOfMeasure.upsert({
      where: { abbreviation: uom.abbreviation },
      update: {},
      create: uom,
    });
  }

  console.log(`Seeded ${uoms.length} units of measure.`);

  // ─── Categories ─────────────────────────────────────────────────────────────
  const categories = [
    {
      name: "Lumber",
      description: "Dimensional hardwood and softwood lumber",
      color: "#92400e",
      icon: "tree-pine",
      attributeSchema: [
        { key: "species", label: "Species", type: "string", required: true },
        {
          key: "thickness_quarters",
          label: "Thickness",
          type: "quarters",
          required: true,
          hint: "Entered and displayed as X/4 (e.g. 8/4). Stored as integer numerator.",
        },
        {
          key: "width_inches",
          label: "Width (inches)",
          type: "number",
          required: false,
        },
        {
          key: "grade",
          label: "Grade",
          type: "string",
          required: false,
          options: ["FAS", "Select", "No.1 Common", "No.2 Common", "Utility"],
        },
        {
          key: "finish",
          label: "Surface Finish",
          type: "string",
          required: false,
          options: ["Rough", "S2S", "S4S"],
        },
        {
          key: "kiln_dried",
          label: "Kiln Dried",
          type: "boolean",
          required: false,
        },
      ],
    },
    {
      name: "Sheet Goods",
      description: "Plywood, MDF, and other sheet materials",
      color: "#1e3a5f",
      icon: "layers",
      attributeSchema: [
        {
          key: "material",
          label: "Material",
          type: "string",
          required: true,
          options: ["Plywood", "MDF", "Particle Board", "Melamine", "OSB"],
        },
        {
          key: "thickness",
          label: "Thickness (in)",
          type: "number",
          required: true,
        },
        {
          key: "dimensions",
          label: "Sheet Size",
          type: "string",
          required: false,
          options: ["4x8", "4x10", "5x5"],
        },
        { key: "grade", label: "Grade", type: "string", required: false },
      ],
    },
    {
      name: "Consumables",
      description: "Glues, finishes, sandpaper, and other consumables",
      color: "#065f46",
      icon: "flask-conical",
      attributeSchema: [
        { key: "brand", label: "Brand", type: "string", required: false },
        { key: "sku", label: "Vendor SKU", type: "string", required: false },
      ],
    },
    {
      name: "Hardware",
      description: "Screws, bolts, hinges, and other hardware",
      color: "#4c1d95",
      icon: "wrench",
      attributeSchema: [
        { key: "brand", label: "Brand", type: "string", required: false },
        { key: "size", label: "Size/Spec", type: "string", required: false },
        { key: "finish", label: "Finish", type: "string", required: false },
      ],
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
