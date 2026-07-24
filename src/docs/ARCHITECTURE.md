
Questo documento cambia raramente. Contiene l'architettura stabile.

```md
# Fluidnatek LE-500 Smart Memory — Architecture

## Product Vision

Fluidnatek LE-500 Smart Memory è un prodotto SaaS industriale destinato ad aziende che utilizzano sistemi di elettrofilatura Fluidnatek.

Il sistema dovrà gestire:

- formulazioni;
- progetti;
- esperimenti;
- parametri macchina;
- telemetria;
- importazione Excel;
- analisi storiche;
- suggerimenti AI;
- ottimizzazione dei parametri;
- memoria aziendale;
- futura integrazione con Fluidnatek LE-500.

---

## Architectural Principles

1. Qualità dell'architettura prima della velocità.
2. Nessun refactoring distruttivo.
3. Compatibilità con il codice esistente.
4. Una responsabilità per modulo.
5. Preferire composizione a classi monolitiche.
6. Evitare file troppo grandi.
7. TypeScript strict.
8. Vietato utilizzare `any`, salvo eccezioni documentate.
9. Firestore è la persistenza definitiva.
10. L'importatore Excel deve essere auto-adattivo.
11. UI, dominio, infrastruttura e persistenza devono rimanere separati.

---

## Core Engine

```text
core/
├─ extractor
├─ resolver
├─ normalizer
├─ validator
├─ dictionaries
├─ learning
├─ confidence
├─ pipeline
├─ report
└─ types
```
