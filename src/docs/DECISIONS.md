
Qui registriamo solo le decisioni architetturali importanti.

```md
# Fluidnatek LE-500 Smart Memory — Architecture Decisions

Questo file registra le decisioni architetturali che non devono essere perse tra chat, sviluppatori o sessioni di lavoro.

---

## ADR-001 — Firestore as the definitive persistence layer

**Status:** Accepted  
**Date:** 2026-07-23

### Context

I dati dell'applicazione devono essere disponibili indipendentemente dal computer o dalla sessione browser utilizzata.

### Decision

Firestore sarà la fonte definitiva per:

- progetti;
- formulazioni;
- esperimenti;
- telemetria;
- conoscenza appresa;
- configurazioni condivise.

### Consequences

- `localStorage` non può essere la persistenza definitiva.
- Le operazioni devono supportare loading, errori e sincronizzazione.
- Le entità Firestore devono avere modelli rigorosamente tipizzati.

---

## ADR-002 — Modular Core Engine

**Status:** Accepted  
**Date:** 2026-07-23

### Context

Il motore di importazione Excel dovrà crescere e supportare template sconosciuti.

### Decision

Il Core Engine sarà separato nei moduli:

- extractor;
- resolver;
- normalizer;
- validator;
- dictionaries;
- learning;
- confidence;
- pipeline;
- report;
- types.

### Consequences

- La logica semantica non deve essere inserita nell'Extractor.
- La Pipeline coordina, ma non implementa tutte le operazioni.
- Learning e Firestore devono rimanere separati dalla lettura fisica di Excel.

---

## ADR-003 — Adaptive Excel import

**Status:** Accepted  
**Date:** 2026-07-23

### Context

I file Excel Fluidnatek possono differire per struttura, lingua, colonne, fogli e posizione degli header.

### Decision

Il motore non utilizzerà template rigidi o coordinate fisse.

### Consequences

- Gli header saranno rilevati tramite scoring.
- Le colonne saranno risolte semanticamente.
- Il motore produrrà livelli di confidence.
- Alias e nuovi pattern potranno essere appresi nel tempo.
```
