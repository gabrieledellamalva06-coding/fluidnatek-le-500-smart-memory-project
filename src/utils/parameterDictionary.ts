export const PARAMETER_DICTIONARY = {

voltage:[
"hv",
"hv+",
"hv-",
"voltage",
"volt",
"kv",
"high voltage",
"applied voltage",
"voltaje",
"tensione"
],

flow:[
"flow",
"flow rate",
"ml/h",
"mlh",
"q",
"q1",
"caudal",
"portata"
],

temperature:[
"temperature",
"temp",
"t",
"°c",
"ºc"
],

humidity:[
"humidity",
"rh",
"hr",
"relative humidity",
"umidità",
"humedad"
],

distance:[
"distance",
"gap",
"dz",
"collector distance",
"position y",
"posición y"
],

collector:[
"collector",
"drum",
"plate",
"mandrel"
],

injector:[
"injector",
"needle",
"spinneret",
"emitter"
],

stability:[
"jet stability",
"stability",
"grade",
"procesabilidad",
"processability"
],

time:[
  "time",
  "tempo",
  "tiempo",
  "timestamp",
  "sec",
  "seconds",
  "t (s)"
]

};

export function detectParameter(header: string): string | null {

  const h = header.toLowerCase().trim();

  for (const [parameter, aliases] of Object.entries(PARAMETER_DICTIONARY)) {

    if (aliases.some(alias => h.includes(alias.toLowerCase()))) {
      return parameter;
    }

  }

  return null;

}