# Tutor Release Checklist

## Code

- [ ] `npm install` completes
- [ ] `npm run lint` completes with zero TypeScript errors
- [ ] `npm run build` completes
- [ ] No real secrets are committed
- [ ] `.env` is ignored by Git
- [ ] `.env.example` is committed

## Application

- [ ] Dashboard opens
- [ ] Sidebar navigation works
- [ ] Browser zoom is 100%
- [ ] Experiment selection works
- [ ] Telemetry charts render
- [ ] AI recommendation works
- [ ] AI telemetry analysis works
- [ ] AI chat works
- [ ] Run Config saves a new experiment
- [ ] Reload preserves the new experiment
- [ ] Excel Import opens
- [ ] Language switching works

## Firestore

- [ ] Anonymous authentication succeeds
- [ ] Projects load
- [ ] Formulations load
- [ ] Experiments load
- [ ] Smoke-test experiment exists
- [ ] Process record exists
- [ ] Setup exists
- [ ] No unintended mass deletion occurred

## Documentation

- [ ] README reviewed
- [ ] CHANGELOG reviewed
- [ ] ROADMAP reviewed
- [ ] Known limitations disclosed

## Git

```powershell
git status
git add .
git commit -m "feat: prepare Fluidnatek Smart Memory tutor release"
git push
```

## Final Demo

- [ ] Open the application in a clean browser window
- [ ] Use 100% browser zoom
- [ ] Select a representative historical experiment
- [ ] Demonstrate AI analysis
- [ ] Create one tutor test run
- [ ] Reload and verify persistence
