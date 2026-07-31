import "dotenv/config";

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

interface ExperimentDocument {
  operationIdentifier?: unknown;
  formulationId?: unknown;
  setupId?: unknown;
  processRecordIds?: unknown;
  createdAt?: unknown;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Variabile mancante nel file .env: ${name}`
    );
  }

  return value;
}

function asString(value: unknown): string {
  return typeof value === "string"
    ? value
    : "";
}

function normalizeIdentifier(
  value: unknown
): string {
  return asString(value)
    .trim()
    .toLocaleLowerCase();
}

async function main(): Promise<void> {
  const app = initializeApp({
    apiKey: requireEnv(
      "VITE_FIREBASE_API_KEY"
    ),
    authDomain: requireEnv(
      "VITE_FIREBASE_AUTH_DOMAIN"
    ),
    projectId: requireEnv(
      "VITE_FIREBASE_PROJECT_ID"
    ),
    storageBucket: requireEnv(
      "VITE_FIREBASE_STORAGE_BUCKET"
    ),
    messagingSenderId: requireEnv(
      "VITE_FIREBASE_MESSAGING_SENDER_ID"
    ),
    appId: requireEnv(
      "VITE_FIREBASE_APP_ID"
    ),
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInAnonymously(auth);

  const basePath = "companies/default";

  const [
    experimentsSnapshot,
    processRecordsSnapshot,
    setupsSnapshot,
  ] = await Promise.all([
    getDocs(
      collection(
        db,
        `${basePath}/experiments`
      )
    ),
    getDocs(
      collection(
        db,
        `${basePath}/processRecords`
      )
    ),
    getDocs(
      collection(
        db,
        `${basePath}/setups`
      )
    ),
  ]);

  const experiments =
    experimentsSnapshot.docs.map(
      (documentSnapshot) => ({
        id: documentSnapshot.id,
        data:
          documentSnapshot.data() as ExperimentDocument,
      })
    );

  const identifiers = new Map<
    string,
    string[]
  >();

  for (const experiment of experiments) {
    const normalizedIdentifier =
      normalizeIdentifier(
        experiment.data.operationIdentifier
      );

    if (!normalizedIdentifier) {
      continue;
    }

    const existing =
      identifiers.get(
        normalizedIdentifier
      ) ?? [];

    existing.push(experiment.id);

    identifiers.set(
      normalizedIdentifier,
      existing
    );
  }

  const duplicates = [
    ...identifiers.entries(),
  ]
    .filter(([, ids]) => ids.length > 1)
    .sort(
      (first, second) =>
        second[1].length -
        first[1].length
    );

  console.log("\n=== FIRESTORE AUDIT ===");
  console.log(
    `Experiments:    ${experimentsSnapshot.size}`
  );
  console.log(
    `ProcessRecords: ${processRecordsSnapshot.size}`
  );
  console.log(
    `Setups:         ${setupsSnapshot.size}`
  );
  console.log(
    `Duplicate operationIdentifier groups: ${duplicates.length}`
  );

  if (duplicates.length > 0) {
    console.log(
      "\n=== DUPLICATI ==="
    );

    console.table(
      duplicates.map(
        ([operationIdentifier, ids]) => ({
          operationIdentifier,
          occurrences: ids.length,
          documentIds: ids.join(", "),
        })
      )
    );
  }

  const smokeTest = experiments.filter(
    (experiment) =>
      normalizeIdentifier(
        experiment.data.operationIdentifier
      ) === "firestore-smoke-001"
  );

  console.log(
    "\n=== FIRESTORE-SMOKE-001 ==="
  );

  if (smokeTest.length === 0) {
    console.log(
      "NON TROVATO: il test non è stato salvato."
    );
  } else {
    console.table(
      smokeTest.map((experiment) => ({
        id: experiment.id,
        operationIdentifier:
          asString(
            experiment.data
              .operationIdentifier
          ),
        formulationId: asString(
          experiment.data.formulationId
        ),
        setupId: asString(
          experiment.data.setupId
        ),
        processRecordIds:
          Array.isArray(
            experiment.data.processRecordIds
          )
            ? experiment.data.processRecordIds.join(
                ", "
              )
            : "",
        createdAt: asString(
          experiment.data.createdAt
        ),
      }))
    );
  }

  try {
    const latestSnapshot = await getDocs(
      query(
        collection(
          db,
          `${basePath}/experiments`
        ),
        orderBy("createdAt", "desc"),
        limit(10)
      )
    );

    console.log(
      "\n=== ULTIMI 10 ESPERIMENTI ==="
    );

    console.table(
      latestSnapshot.docs.map(
        (documentSnapshot) => {
          const data =
            documentSnapshot.data() as ExperimentDocument;

          return {
            id: documentSnapshot.id,
            operationIdentifier:
              asString(
                data.operationIdentifier
              ),
            formulationId:
              asString(
                data.formulationId
              ),
            createdAt:
              asString(data.createdAt),
          };
        }
      )
    );
  } catch {
    console.log(
      "\nImpossibile ordinare per createdAt; elenco non ordinato dei primi 10 documenti:"
    );

    console.table(
      experiments
        .slice(0, 10)
        .map((experiment) => ({
          id: experiment.id,
          operationIdentifier:
            asString(
              experiment.data
                .operationIdentifier
            ),
          formulationId:
            asString(
              experiment.data
                .formulationId
            ),
          createdAt:
            asString(
              experiment.data.createdAt
            ),
        }))
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    "\nAUDIT FALLITO:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exitCode = 1;
});