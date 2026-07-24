export interface MaterialDefinition {

    id: string;

    canonicalName: string;

    category:
        | "polymer"
        | "solvent"
        | "additive"
        | "nanoparticle"
        | "surfactant"
        | "salt"
        | "other";

    aliases: string[];

    manufacturers?: string[];

    commercialNames?: string[];

    productCodes?: string[];

    chemicalFormula?: string;

    casNumber?: string;

    description?: string;

    aiTags?: string[];

}

export const MaterialDictionary: MaterialDefinition[] = [

{
    id: "PVDF",

    canonicalName: "PVDF",

    category: "polymer",

    aliases: [

        "pvdf",

        "polyvinylidene fluoride",

        "kynar",

        "kynar hsv900",

        "solef",

        "solef 6010"

    ],

    manufacturers: [

        "Arkema",

        "Solvay"

    ],

    commercialNames: [

        "Kynar",

        "Solef"

    ],

    aiTags: [

        "electrospinning",

        "piezoelectric",

        "fluoropolymer"

    ]

},

{
    id: "PCL",

    canonicalName: "PCL",

    category: "polymer",

    aliases: [

        "pcl",

        "polycaprolactone"

    ],

    aiTags: [

        "biopolymer",

        "electrospinning"

    ]

}

];