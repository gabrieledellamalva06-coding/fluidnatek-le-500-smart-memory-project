# Fluidnatek Smart Memory — User Guide

This guide describes the features currently available in the application. It is intended for laboratory users working with Fluidnatek equipment and shared historical experiment data.

> **Available now:** Project, formulation, characterization, setup, run, comparison, recommendation, variation, and Excel-import workflows described below.
>
> **Current limitation:** Machine telemetry is not connected. Operating values are entered by the operator.
>
> **Future work:** Features not visible in the current application are not covered here.

## 1. Purpose of the application

**Purpose:** Use previous laboratory work as practical memory when preparing and recording a new electrospinning run.

Smart Memory records five different kinds of information:

| Information | Meaning |
|---|---|
| Solution/formulation | The polymer identities and grades, concentrations, solvents, solvent ratios, and formulation notes. |
| Machine setup | Reusable hardware: machine, injector, needles or emitters, collector, and platform configuration. |
| Operating parameters | Run-specific setpoints such as flow, voltage, temperature, humidity, distance, and drum speed. |
| Solution characterization | Measured physical properties such as viscosity and conductivity. |
| Experiment result | The observed processability grade and operator comments recorded after the run. |

These records are connected but are not interchangeable. For example, selecting a hardware setup does not fill the operating parameters, and adding a catalog material does not create a formulation.

The green connection banner shows that the application is **Connected to shared Firestore**. Everyone using the same Firestore database works with the same shared records. Use **Refresh shared data** when another user's newly created data is not yet visible.

**What happens after this?** Each saved run becomes part of the shared historical memory used by later searches and recommendations.

## 2. Five-minute quick start

**Purpose:** Complete the normal experiment workflow with the minimum essential steps.

1. Open **1. Current Project**, search for a project, and select it. Use **Create New Project** only when necessary.
2. Continue to **Formulation & Characterization**. Select a formulation belonging to the Current Project or create one.
3. If measurements are available, select an existing characterization or use **Add Characterization**.
4. Continue to **Machine Setup**. Select a suitable setup or use **Create New Setup**.
5. In **Current Operating Parameters**, enter the intended setpoints and a **Run / Sample Code**.
6. Review **Smart Starting Point**, **Historical Analysis**, and **Recommended Starting Parameters** when useful. Applying a suggestion changes only the current form.
7. Select **Continue to Actual Processability**, then enter the observed grade and comments after performing the experiment.
8. Review all sections in the final review and select **Save Run & Update Memory**.

**What happens after this?** The saved run appears in **Historical Experiments** and can contribute to future evidence when it meets the relevant rules.

## 3. Current Project

**Purpose:** Define which project owns new formulations, setups, and experiments created in the workflow.

### Select an existing project

1. Open **1. Current Project**.
2. Type in **Search project...** to narrow the list.
3. Choose a project from **Choose a project**.
4. Review the **Selected Project** card and its formulation and run counts.
5. Select **Continue to Formulation →**.

### Create a project

1. Select **Create New Project**.
2. Enter **Project Code / Name**. This is required.
3. Optionally enter **Description**.
4. Select **Create Project**.

The selected project is shown as **Current Project** at the top of the application. Formulations, setups, and experiments created during the workflow are linked to it. **Change Project** returns to project selection and clears the current formulation, characterization, and setup selections.

[Screenshot: Current Project selection]

**What happens after this?** The formulation screen opens in the context of the selected project.

## 4. Formulation creation

**Purpose:** Select or create the exact polymer/solvent composition used for the run.

### Select an existing formulation

Use **Choose Formulation** and its search field. **Current Project** shows formulations owned by the selected project. **All Formulations** is browse mode: a formulation from another project can be inspected, but it cannot be used to continue the current run.

### Create a new formulation

1. Select **Create New Formulation**.
2. Enter **Formulation Name / ID**.
3. Under Polymer 1, choose **Polymer** first.
4. Then choose **Molecular Weight / Grade**. This selector remains disabled until a polymer identity is selected.
5. Enter **Polymer Concentration**. Numeric zero remains a real value.
6. Use **+ Add another polymer** only when Polymer 2 or Polymer 3 is required.
7. Optional polymers must have an identity/variant and concentration. Use **× Remove** to remove one. If Polymer 2 is removed while Polymer 3 exists, Polymer 3 moves intact into Polymer 2.
8. Choose **Solvent 1** and enter its ratio.
9. Add Solvent 2 or Solvent 3 only when required. Remove optional solvents with their remove control.
10. Make sure the ratios of all visible solvents total exactly 100%.
11. Add **Notes** if useful.
12. Select **Create Formulation**.

The application rejects incomplete optional rows, solvent ratios outside 0–100%, duplicate visible solvents, and totals other than 100%. Each visible solvent must be a different material.

### Add a polymer to the catalog

Select **Add Existing Polymer Variant OR Add New Polymer**.

- **Existing polymer:** choose **Polymer identity**, then add a distinct product, grade, or molecular-weight variant.
- **New polymer:** enter **New polymer name** and optionally **Short identity / code / alias**.
- Complete **Exact product / grade name**. Add **Molecular weight (optional)** with its unit when known. **Supplier / manufacturer (optional)** and **Article / product code (optional)** help identify the material accurately.
- If an exact variant already exists, use **Use existing variant** rather than creating a duplicate.

Adding a material only updates the shared catalog and selects that material in the form. It does **not** create the formulation; finish the composition and select **Create Formulation**.

[Screenshot: Formulation creation with optional polymer and solvent cards]
[Screenshot: Add Existing Polymer Variant OR Add New Polymer]

**What happens after this?** The new formulation becomes selected and the characterization area becomes available.

## 5. Solution Characterization

**Purpose:** Record measured physical properties of the selected solution without inventing missing values.

Select **Add Characterization**, enter the measurement date when known, and provide one or more measurements:

| Field | What to enter |
|---|---|
| Solid content | Measured solids percentage by weight. |
| Viscosity | Measured viscosity in mPa·s. |
| Conductivity | Measured conductivity in µS/cm. |
| Density | Measured density in g/cm³. |
| Surface tension | Measured surface tension in mN/m. |
| pH | Measured pH. |

At least one finite, real measurement is required. **Save Characterization** remains disabled when every measurement is empty or invalid, and the form shows **Enter at least one measurement before saving.** Zero is valid. An empty field stays missing and is displayed as **No data**; never type zero to represent an unknown value.

Existing records appear in the characterization selector using measurement dates and concise measurement summaries. Records with no usable measurements are not selectable evidence.

### Edit a current-session characterization

Only a characterization created during the current browser session is editable under the current rules. Open its edit form, change the measurements, and provide:

- **Change reason** — why the stored values need correction.
- **Changed by** — the person making the change.

After saving, the record displays an **Updated** badge. Use **View change history** to inspect previous values. Revisions are read-only and remain preserved; editing does not rewrite the previous revision.

[Screenshot: Add Characterization and measurement validation]
[Screenshot: Updated characterization and View change history]

**What happens after this?** A valid selected characterization becomes the current solution measurement used in historical characterization comparison.

## 6. Historical Characterization Comparison

**Purpose:** Compare the current solution measurements with one selected historical characterization.

Evidence is grouped as:

- **Same formulation** — measurements linked to the exact selected formulation.
- **Similar formulation** — eligible measurements from a formulation considered compositionally similar by the implemented comparison rules.

No comparison is automatic. Select one historical record explicitly. The comparison then shows the **Current value**, **Historical value**, and **Difference** for available measurements. Numeric zero is treated as data.

Open **Excluded evidence** to see records that cannot be used. Common reasons include:

- **No usable characterization measurements.**
- Missing measurements needed for comparison.
- Incompatible solvent systems.
- Other eligibility or data-availability restrictions shown by the interface.

**No data** means a usable value was not recorded. It is not zero and is never counted as a match.

For similar formulations, **Conditional Solution Similarity** summarizes the comparable formulation attributes available for that pair. **Why this similarity?** shows the contributing details. Treat this as a transparent software comparison—not scientific certainty, proof of equivalence, or a guaranteed target.

If the selected current characterization contains no usable measurement, historical evidence is suppressed and the application shows **Add at least one characterization measurement to compare with historical evidence.**

[Screenshot: Historical Characterization Comparison and Excluded evidence]

**What happens after this?** The comparison remains read-only. It informs the operator but does not change the current formulation or measurements.

## 7. Machine Setup

**Purpose:** Select the reusable hardware configuration for the run.

By default, **Choose Machine & Setup** lists setups belonging to the Current Project. Filter with **Machine** and **Search Setup**. When a search is entered, the selector intentionally broadens to **Historical and project setups**, allowing a compatible historical setup to be selected even when no setup is linked to the Current Project.

After selection, review the displayed machine model/manufacturer, injector type/model, needle gauge/count, emitter count, collector type/model/dimensions, platform configuration, and notes. Empty or unknown fields are hidden.

To create a setup:

1. Select **Create New Setup**.
2. Complete **Setup Name**, **Machine Model**, **Injector Type**, and **Collector Type**; these are required.
3. Add the known manufacturer, serial number, injector/needle/emitter, collector, platform, and note fields.
4. Select **Save Setup**.

A setup describes reusable hardware. Voltage, flow, climate, distance, and drum speed are run-specific operating parameters entered later.

[Screenshot: Machine Setup selection and hardware details]

**What happens after this?** Select **Continue to Experimental Run** to enter the intended operating conditions.

## 8. Current Operating Parameters

**Purpose:** Record the setpoints the operator plans to use for this run.

The current UI uses these labels:

| UI label | Meaning | Unit |
|---|---|---|
| Q1 | Flow rate | mL/h |
| HV+ | Positive high voltage | kV |
| HV- | Collector/negative voltage | kV |
| Temperature | Chamber temperature | °C |
| RH | Relative humidity | % |
| dZ | Working distance | mm |
| Drum speed | Drum/collector speed | rpm |

Enter a unique **Run / Sample Code** such as `PEO-RUN-024`. It is required before the run can be saved.

The screen states **Machine telemetry unavailable** because DataHub is not connected. Values entered here are operator-entered setpoints, not real-time machine signals. Zero remains a valid numeric entry where allowed by the field.

**What happens after this?** The current values become the basis for historical searches, recommendation previews, and the final saved process record.

## 9. Smart Starting Point

**Purpose:** Offer simple historical median values from successful runs using the exact same formulation.

Only historical experiments with the exact formulation and a processability grade of 3 or 4 contribute. Each displayed parameter is a historical median and shows **Based on N experiments**. A parameter needs at least two contributing successful experiments; otherwise it is unsupported. The panel also reports **Historical evidence coverage**.

To use it:

1. Review the displayed medians and supporting counts.
2. Select **Apply smart point**.
3. In **Apply Smart Starting Point**, compare **Current value** with **Historical median**.
4. Select **Cancel** to leave the form unchanged, or **Confirm and apply** to update the current form.

Confirming does not save an experiment. Applied values remain editable before the final review.

**What happens after this?** Changed fields are marked as applied from Smart Starting Point; later manual adjustments are also identified.

## 10. Historical Analysis

**Purpose:** Inspect similar historical solutions and compare selected process conditions separately.

### Similar Solutions

**Similar Solutions** ranks eligible experiments using formulation/solution information. **Solution Similarity** refers to solution composition and available comparable attributes. A high Solution Similarity does not mean the operating conditions were identical.

### Similar Process Conditions

1. Choose only the process parameters you want to use as search constraints.
2. Select **Find Similar Process Conditions**.
3. Read each result as three separate facts:
   - **Process similarity X%** — the existing calculated process score.
   - **Matches X/Y** — selected conditions that meet the existing Same/tolerance rule, out of all selected conditions.
   - **Comparable data X/Y** — selected conditions with valid values on both sides, out of all selected conditions.
4. Read **Solution** and **Grade** separately; they do not form part of those counts.

The expanded comparison classifies values as:

- **Same** — equal under the implemented comparison rule.
- **Close** — within the accepted tolerance.
- **Different** — outside that tolerance.
- **No data** — one side lacks a usable value; it is neither comparable nor a match.
- **Not used in this search** — displayed for context but excluded from every selected-condition count and score.

Select a result row to open its inline comparison. Select it again to close it; opening another result replaces the previous comparison.

[Screenshot: Similar Process Conditions result with Matches and Comparable data]

**What happens after this?** Historical Analysis remains advisory and read-only; it does not change the current form automatically.

## 11. Recommended Starting Parameters

**Purpose:** Suggest evidence-based starting values from sufficiently similar, successful historical experiments.

The compact summary shows the **Historical evidence level**, number of similar experiments, successful experiments supporting at least one recommendation, **Best Solution Similarity**, and historical grade when available. **How were these recommendations calculated?** opens and closes a plain-language explanation.

Each parameter card shows:

- Parameter name and recommended value/unit.
- Evidence label.
- **Based on N successful experiments**.
- Historical usable range.
- **Why this recommendation?** for parameter-specific evidence.

Opening parameter evidence places one full-width panel below the cards. Opening another replaces it; selecting the same control closes it. Included and excluded historical values show readable experiment names, raw value, Solution Similarity, grade, and the exclusion reason. Detailed weights are hidden under **Calculation details**.

**No reliable historical recommendation** means the evidence was insufficient—for example, fewer than two supporting experiments, no parameter consensus, or missing historical values. Such a card has no apply checkbox. Missing values, outliers, and values without consensus are excluded; no value is invented.

Select individual reliable recommendations or use the available select-all control, then open the preview. **Cancel** changes nothing. Confirming updates only the current form. Values remain editable and are not saved automatically.

Recommendations are historical starting points, not guaranteed machine setpoints.

[Screenshot: Recommended Starting Parameters cards and evidence panel]

**What happens after this?** Applied fields are tracked for final review, including any manual changes made afterward.

## 12. Actual Processability and experiment result

**Purpose:** Record what was observed after the physical experiment was performed.

Select **Continue to Actual Processability** only after entering the planned operating parameters. Under **Observed Processability**, record the grade using the available 1–4 choices, then enter observations in **Process Comments**. These fields describe the outcome, not the plan.

Do not estimate a favorable grade before running the experiment. Use comments to record useful observations, deviations, failures, and material behavior.

**What happens after this?** Continue to the final review. Nothing is added to historical memory until the final save.

## 13. Final Review and Save

**Purpose:** Verify the complete run before adding it to shared memory.

The review includes:

- **Project**
- **Formulation**
- **Characterization** when selected
- **Machine Setup**
- **Operating Parameters**
- **Changes Made During This Run**
- **Result**

Applied recommendations show their source. If an applied value was then edited, the review identifies it as manually adjusted and shows the original and final values.

Select **Edit** to return to the result stage without saving. Select **Save Run & Update Memory** only after checking the formulation, setup, setpoints, run code, grade, and comments. The save creates the experiment and its process record in shared Firestore; it does not alter historical source experiments.

[Screenshot: Final Review and Save Run & Update Memory]

**What happens after this?** The new run becomes visible in **Historical Experiments** and may support future comparisons or recommendations when eligible.

## 14. Historical Experiments

**Purpose:** Search, inspect, and safely reuse saved experiment records.

Use the main search to search run, project, formulation, polymer, machine, or comment. Filter by project, polymer, solvent, machine, grade, and available type fields. **Advanced filters** adds minimum/maximum ranges for flow rate, HV+, HV−, temperature, humidity, and working distance. Records missing an actively filtered parameter are excluded. Column headings can be used for sorting; **Reset filters** clears the current filters.

Select a row to open it inline; select it again or use the close control to close it. The expanded record is labelled **Historical record · Read-only**. It shows context, process parameters, observations, and **Data quality**. Data Quality measures record completeness and consistency, not whether the scientific result was good.

### Clone as variation

1. Open a historical experiment and select **Clone as variation**.
2. Choose a process record when more than one is available.
3. Enter a new run name and change at least one operating parameter.
4. Select **Create New Variation**.
5. In **Confirm New Variation**, enter required **Changed by** and **Reason for variation**.
6. Review the changes and select **Confirm and Create Variation**.

The new record is a **planned** experiment. It copies the project, formulation, setup, and selected operating values. Historical outcome data—grade, comments, material-characterization results, and source results—are intentionally not copied as new results. The source remains unchanged.

For a saved variation, **Variation Summary** shows its source, creator, creation time, reason, and changes. Use **View source experiment** when the source is available in the current filtered results.

[Screenshot: Historical Experiments filters and inline record]
[Screenshot: Confirm New Variation and Variation Summary]

**What happens after this?** The planned variation is saved as a separate experiment and can later be completed through the normal run workflow.

## 15. Historical Data Import

**Purpose:** Add reviewed legacy or externally generated Fluidnatek Excel data to shared historical memory.

1. Open **Historical Data Import**.
2. Optionally open **Excel Format Guide**.
3. Under **Associate Historical Runs to Project**, choose the project that owns the historical runs.
4. Drop `.xlsx`, `.xlsm`, or `.xls` files into **Drop Excel files here or click to upload**, or click to select them.
5. Review **Imported File Review**. Valid rows are persisted; incomplete or invalid rows may be skipped.

Do not import demonstrations, test files, garbage data, or unreviewed workbooks into the shared production dataset. Imported legacy records may legitimately show **No data** for fields that were absent in the source file.

**What happens after this?** Valid imported runs are stored in Firestore under the selected project and become shared historical records.

## 16. Important terms

**Purpose:** Interpret the application's evidence language consistently.

| Term | Meaning |
|---|---|
| No data | No finite usable value was recorded. It does not mean zero. |
| Same | Values satisfy the implemented equality/match rule. |
| Close | Values fall within the implemented tolerance. |
| Different | Values fall outside the implemented tolerance. |
| Solution Similarity | Similarity of solution/formulation attributes with available comparable data. |
| Process Similarity | Score for the process constraints selected when the search was run. |
| Historical Grade | The recorded 1–4 processability grade of a historical experiment. |
| Data Quality | Completeness/consistency of the stored record, not scientific quality. |
| Historical evidence | Read-only observations from previous saved experiments or characterizations. |
| Recommendation | A calculated historical starting point that the operator may preview and apply. |
| Planned variation | A new experiment derived from a source experiment, with changed setpoints but no copied result. |

## 17. Common problems and solutions

**Purpose:** Resolve common workflow blocks without altering historical data.

| Problem | What to check |
|---|---|
| Create button disabled | Complete all required visible fields; remove unused optional polymer/solvent rows. |
| Solvent total is not 100% | Make the ratios of all visible solvents total exactly 100%; each ratio must be 0–100%. |
| Molecular weight/grade is unavailable | Select **Polymer** first. If the grade does not exist, add a valid catalog variant. |
| No characterization comparison appears | Select a characterization with at least one usable measurement, then explicitly select historical evidence. Check **Excluded evidence**. |
| No reliable recommendation appears | There may be too few successful similar runs, missing values, outliers, or no consensus for that parameter. |
| Smart Starting Point is unavailable | The exact formulation needs at least two grade 3–4 experiments contributing to a parameter. |
| Run cannot be saved | Select a Current Project, current-project formulation, and setup; provide finite values for Q1, HV+, and dZ; enter **Run / Sample Code**; and complete the result stage. |
| Newly created shared data is not visible | Select **Refresh shared data** or reload after confirming the save completed. |

**What happens after this?** If the problem remains, record the visible error message and the workflow step; do not recreate historical data as a workaround.

## 18. Safe-use rules

**Purpose:** Protect the quality and meaning of shared laboratory memory.

- Do not interpret similarity as scientific proof.
- Do not treat recommendations as guaranteed setpoints.
- Do not edit, change, or recreate historical records to make outcomes look better.
- Use **No data** for unknown values; never invent a zero.
- Review formulation, characterization, setup, and operating parameters before saving.
- Record the actual result after the experiment, including unfavorable outcomes.
- Avoid importing test, demonstration, garbage, or unreviewed data into shared Firestore.
- Refresh before creating apparent duplicates when another user may have just added shared data.

## Printable one-page workflow checklist

### Before the experiment

- [ ] Confirm **Connected to shared Firestore**.
- [ ] Select the correct **Current Project**.
- [ ] Select or create the correct formulation.
- [ ] Verify polymer identity, **Molecular Weight / Grade**, concentration, solvents, and 100% solvent total.
- [ ] Select or add a characterization when real measurements are available.
- [ ] Leave unknown measurements empty; keep real zero values as zero.
- [ ] Select the correct **Machine Setup** and review its hardware details.
- [ ] Enter Q1, HV+, HV-, Temperature, RH, dZ, and Drum speed.
- [ ] Enter a unique **Run / Sample Code**.
- [ ] Review Smart Starting Point, Historical Analysis, and Recommended Starting Parameters as advisory evidence.
- [ ] Preview every recommendation before applying it.
- [ ] Recheck any applied or manually adjusted setpoints.

### After the experiment

- [ ] Enter the actual processability grade.
- [ ] Record comments and observed results, including failures or deviations.
- [ ] Review Project, Formulation, Characterization, Machine Setup, Operating Parameters, Changes, and Result.
- [ ] Select **Save Run & Update Memory** once.
- [ ] Confirm the run appears in **Historical Experiments**; refresh shared data if necessary.

### Always

- [ ] Treat similarity and recommendations as evidence, not proof.
- [ ] Preserve historical records.
- [ ] Never substitute invented values for **No data**.
- [ ] Import only reviewed production data.
