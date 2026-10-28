# Calibration Transfer and Fit Method: Does a Calibration Map Fitted on the Loop's Question Mix Transfer, and What Should v1 Fit?

Compiled 2026-10-27 for wayfinder ticket [#18](https://github.com/DylanRigney/agentic-prediction-copilot/issues/18) (child of map [#15](https://github.com/DylanRigney/agentic-prediction-copilot/issues/15)).
Method: web research following claims to primary sources (arXiv, NeurIPS/ICML proceedings, Metaculus's own analyses, peer-reviewed journals). This **extends** `docs/research/llm-forecasting-landscape.md` §2 (which established: Platt scaling Brier −.016 in tournaments, extreme capping r=+.48, verbalized-after-answer elicitation, Murphy decomposition) — it does not re-establish those. Claims that could not be traced to a primary source are marked **[unverified]**; reasoning from adjacent evidence is labeled **[inference]**.

Practical frame: v1 accumulates ~100–300 resolved questions/week, dominated by sports / markets / current-events; the owner's real questions are few and heterogeneous. The deliverable is a calibration recipe: method, granularity, min-N, refit cadence, versioning.

---

## The recipe up front

| Choice | v1 decision | One-line justification |
|---|---|---|
| Method | **2-parameter Platt scaling** in log-odds space, fit with Platt's original prior smoothing; **no isotonic, no adaptive binning** | Only method tournament-validated on LLM forecasts (Metaculus −.016, p=.0005); 2 parameters ≈ safe at ~300+ resolved; every higher-capacity method overfits below ~1000 |
| Granularity | **One global map** for the deployed scaffold version; domains *recorded and monitored*, never separately fitted below ~500 per-domain resolved | Direct test exists: a Platt map fitted on a different question mix *underperformed a fixed constant* (AIA Forecaster, §1.1); domain-conditional fits never reach min-N for the owner's domains |
| Min-N | **Identity map until 300 resolved binary questions** for that scaffold version; below that, only a **fixed, un-fitted** correction (see below) | At 64–138 calibration samples even Platt failed to beat no calibration (§2.2); non-parametric needs ~1000–2000 (§2.1); 300 ≈ where a 2-param fit's variance stops swamping its bias |
| Refit cadence | **Weekly scheduled refit** (resolutions arrive 100–300/week) + **forced refit on any scaffold/model change**; candidate promoted only if it beats the incumbent on a **chronological holdout** (last ~30% of resolved history); rolling fit window capped at the most recent ~1,000–2,000 resolved | Operational recalibration in weather forecasting runs exactly this pattern — rolling window, scheduled refit, per-forecast-type maps (§3.1); Metaculus evaluated recalibration on a temporal 70/30 split and warned strong performers can be *hurt* (§1.2) |
| Versioning | Immutable `cal_v{n}` per scaffold version: stored parameters, fit window, holdout Brier + log loss; every forecast package records `calibration_map_version` + `raw_probability` (already in proposal §6/§9.3); raw ensemble outputs kept (`ForecastRun`) so maps can be re-fit retroactively | Attribution requirement (proposal §9.3); AIA pinned a static constant specifically "to avoid the risk of overfitting to the benchmarks" (§1.1); Metaculus's code and chronological-split protocol are the reusable precedent (§1.2) |
| Capping interaction | **Cap after the map, at serve time**, with *fixed policy* bounds (e.g. clamp to [0.02, 0.99]); never fit the caps from data in v1 | Tail frequencies are statistically unestimable at v1 sample sizes (§3.3); markets show tail-only miscalibration (below 5¢, §1.4); a monotone 2-param map can legitimately *extremize* (§1.1), so the cap is the safety net that bounds worst-case log loss |

Details and evidence below.

---

## 1. Domain-conditional vs global calibration maps: does a map fitted on one question distribution degrade on another?

**Plain statement first: no published study directly tests whether a *forecasting* calibration map (Platt/isotonic) fitted on one question mix (e.g. sports) degrades on another (e.g. personal questions).** That exact experiment does not appear to exist. But the question is answerable from three adjacent evidence layers, each with at least one direct measurement.

### 1.1 Direct: the AIA Forecaster tested an out-of-distribution-fitted Platt map — and it lost to a fixed constant

The AIA Forecaster technical report (arXiv 2511.07678, Nov 2025; Alur, Stadie, Kang, … Sekhon) applies Platt scaling as its final stage and ran the ablation we need on ForecastBench FB-7-21 (498 binary questions):

| Variant | Brier |
|---|---|
| No correction | 0.1140 |
| Fixed log-odds extremization | 0.1085 |
| **Platt fitted out-of-distribution (on Halawi et al. 2024's question set)** | **0.1104** |
| Fixed Platt coefficient √3 ≈ 1.73 (Neyman–Roughgarden constant) | 0.1076 |
| Platt fitted in-distribution (leave-one-out) | 0.1071 |

A calibration map **fitted on a different question distribution underperformed both the in-distribution fit and a non-fitted constant** — i.e. the transfer cost (0.1104 vs 0.1071) exceeded the entire benefit of choosing the "right" parameter adaptively. The authors explicitly deployed the fixed √3 constant "to avoid the risk of overfitting to the benchmarks we consider," citing Neyman & Roughgarden's max-min optimality result for the quadratic (Brier) scoring rule ([arXiv 2102.07081](https://arxiv.org/abs/2102.07081)).

Two structural insights from the same report, both load-bearing for the recipe:

- **Platt scaling on an LLM forecast aggregate acts as extremization** — mathematically identical to applying log-odds extremization to the geometric mean of forecasts, pushing probabilities *away* from 0.5 to counteract LLM hedging; gains concentrate in the 0.6–0.8 and 0.2–0.4 bins, near identity at 0.5. The dominant miscalibration of an LLM forecasting scaffold is **scaffold-level (hedging), not topic-level** — which is precisely the component that *does* transfer across question domains.
- This connects AIA to the human-forecasting aggregation literature: Satopää, Baron, Foster, Tetlock, Tetlock & Ungar, "Combining multiple probability predictions using a simple logit model" (Int. J. Forecasting 30(2), 2014) — logit-average with an extremizing β is the best simple aggregator of human forecasters — and Baron, Mellers, Tetlock, Stone & Ungar, "Two Reasons to Make Aggregated Probability Forecasts More Extreme" (Decision Analysis, 2014): aggregates sit too close to 0.5 both because probability-scale compression drags averages toward the middle and because judges under-weight independent information.

**[inference]** Since v1's pipeline aggregates an ensemble (proposal stage 6), its raw output inherits exactly this compression-toward-0.5 bias. That bias is question-agnostic — the safest thing a *global* map captures, and the thing that transfers.

### 1.2 Direct (tournament conditions): Metaculus's calibration-adjustment analysis — what fitting on the loop's own mix achieves

Metaculus's Calibration Adjustment Analysis (notebook 43356, May 2026 — the primary source behind the −.016 figure in the landscape doc) tested five post-hoc methods on Q1+Q2 2025 AI-benchmark bot forecasts, fitted **per forecaster, per question type** with a **chronological 70/30 train/test split**, only for forecasters with **≥500 forecasts**:

- Logistic recalibration (Platt) was the only method significantly improving **both** binary (Δ Brier = 0.0164 mean, p = 0.00052) and multiple-choice (Δ = 0.0054, p = 0.000053).
- Step-shift (equal-width bins, bin count tuned by internal validation) also significant on both (binary Δ 0.0108, MC Δ 0.0044).
- Decision-tree (adaptive bins, ≥30 obs/bin): **not significant on either — "overfitting noisy bin-level resolution rates."**
- A pooled cross-forecaster model was abandoned (dominated by prolific forecasters); uniform shift *hurt* multiple-choice via renormalization.
- **No per-topic breakdown was attempted** — the only conditioning variables were forecaster and question type. And: improvement vs. raw Brier scatter suggested **stronger (lower-Brier) bots benefit less or are hurt** — hence their recommendation to test recalibration on a bot's own historical forecasts before adopting.
- Corroboration at small n: Metaculus's 2026 synthesis also cites Phan et al. dropping Brier 0.0999 → 0.0934 with Platt scaling on 177 backtested Metaculus questions (fit/eval split not stated — treat the delta as possibly in-sample **[unverified]**).

### 1.3 Adjacent but quantitative: cross-domain recalibration of LLM judges

Afrin & Shihab, "When Accuracy Gaps Fail to Certify: Auditing Cross-Domain Recalibration of LLM Judges" ([arXiv 2609.27954](https://arxiv.org/abs/2609.27954), Aug 2026) audited **13 judges × 2 generators × 8 domains = 1,176 predeclared source→target transfers** of scalar recalibration maps:

- **Source-fitted Platt scaling harmed target-domain performance in 34% of transfers; target-domain temperature scaling fitted on just 16 labels had a harm rate of 0.09.**
- The source→target accuracy gap correlated only 0.25 (95% CI [−0.09, 0.55]) with transfer outcome — a small gap does **not** certify that a source-fitted map transfers.
- Their conclusion: accuracy gaps are "weak warning signals for scalar probability transfer, not deployment certificates."

This is LLM-judge scoring, not forecasting, but it is the largest direct measurement of *calibration-map domain transfer* for LLM scalar outputs, and its headline number (roughly one in three transfers harmed) is the right order-of-magnitude risk to plan around. **[inference from adjacent task]**

### 1.4 Adjacent (ML): post-hoc calibration degrades under distribution shift

- Ovadia et al., "Can you trust your model's uncertainty? Evaluating predictive uncertainty under dataset shift" (NeurIPS 2019, [arXiv 1906.02530](https://arxiv.org/abs/1906.02530)): models well-calibrated in-distribution become progressively miscalibrated (usually overconfident) as shift magnitude grows; deep ensembles the most robust. A calibration relationship fitted at one distribution is not invariant.
- Park, Simić, Perov, et al. — "Post-hoc uncertainty calibration for domain drift scenarios" ([arXiv 2012.10988](https://arxiv.org/html/2012.10988v2), ICML 2021 workshop line): standard post-hoc calibrators tuned in-distribution collapse under drift; propose drift-aware calibration.
- Yu, Bates, et al., "Robust Calibration with Multi-domain Temperature Scaling" (NeurIPS 2022): use **heterogeneity across multiple source domains** to buy worst-case robustness under shift — the principled upgrade path if v1 later wants per-domain information without per-domain data (see §5.4).
- Related: "Impact of Domain Shift on Fine-tuned Model Calibration" (NeurIPS 2021) — pretraining's calibration benefits diminish under shift.

### 1.5 Platform-level traces that calibration structure varies by question segment

Not controlled experiments, but they show the *conditional* structure is real on forecasting platforms:

- Rethink Priorities (Oct 2021), analyzing 626 resolved binary Metaculus questions: Metaculus "was poorly calibrated on resolved questions with a >1 year time horizon" — conditioning variable = **time horizon**, not topic; they excluded long-horizon questions rather than recalibrate per horizon.
- Metaculus's own AI-track-record analysis (May 2023): on 64 resolved binary AI questions the Community Prediction's calibration could not be distinguished from perfect (Brier 0.207; simulation under perfect calibration scored worse ~25% of the time) — but AI questions appeared intrinsically harder; no cross-category calibration comparison was performed.
- Prediction markets: an analysis of 44,116 Polymarket contracts ([Sabharwal, Jul 2026](https://www.mahirsabharwal.com/blog/favourite-longshot-bias)) finds prices "impressively well calibrated across most of the price range, with a clear tail problem below 5¢" — the classic favourite-longshot bias. Miscalibration concentrated in one region of the probability axis, not uniform.
- Theory agrees the tails are special: Allen, Koh, Segers & Ziegel, "Tail calibration of probabilistic forecasts" ([arXiv 2407.03167](https://arxiv.org/abs/2407.03167)) — standard calibration evaluation is ill-suited to tail behavior; extreme-value-theoretic diagnostics are needed there.

**Synthesis for Q1 [inference, from layers 1.1–1.5]:** a calibration map fitted on the loop's sports/markets/current-events mix will transfer to the owner's arbitrary questions *partially*: it captures the dominant, question-agnostic component (ensemble/scaffold hedging toward 0.5 — AIA §1.1), and misses any domain-conditional residual. The miss is bounded because a 2-parameter monotone map is low-capacity (it cannot memorize a domain), and the harm rate from the judge audit (~1/3 for source-fitted maps) is the right risk estimate. Mitigations that fall out: keep the map low-capacity, monitor per-domain reliability residuals, cap extremes at fixed policy bounds, and never promote a refit that fails a chronological holdout.

---

## 2. Small-sample behavior: Platt vs isotonic vs binned at ~100 / 500 / 1000 resolved questions

### 2.1 The canonical results

- **Platt 1999** ("Probabilistic Outputs for SVMs", in *Advances in Large Margin Classifiers*, MIT Press) designed the sigmoid fit *for* small calibration sets: fit A, B by maximum likelihood on **cross-validated** scores (not training scores), and replace 0/1 targets with prior-smoothed targets (t⁺ = (N⁺+1)/(N+2) style pseudo-counts) so the sigmoid can't be driven to extremes. Two parameters, regularized — the original small-sample recalibrator.
- **Niculescu-Mizil & Caruana** ("Predicting Good Probabilities with Supervised Learning", ICML 2005) — the standard citation for method-by-size: **Platt/sigmoid calibration stays reliable with small calibration sets (~a few hundred); isotonic regression is prone to overfitting and needs roughly 1,000+ examples to beat the sigmoid.** The 1,000–2,000-sample guidance for non-parametric calibration is restated verbatim by later work (§2.2).
- **Guo, Pleiss, Sun & Weinberger** ("On Calibration of Modern Neural Networks", ICML 2017, [arXiv 1706.04599](https://arxiv.org/abs/1706.04599)): on modern networks, single-parameter temperature scaling beat matrix scaling, **histogram binning and isotonic regression** (the non-parametric methods overfit limited calibration data). Tournament temperature scaling = Platt constrained to slope-only.
- **Roelofs, Cain, Shlens & Mozer** ("Mitigating Bias in Calibration Error Estimation", ICML 2022, [arXiv 2012.08668](https://arxiv.org/abs/2012.08668)): choosing the binning scheme on the same data used to report calibration error systematically *underestimates* the error (selection bias); also introduce **variable-based calibration** — checking calibration conditioned on a variable of interest — which is the right diagnostic tool for per-domain monitoring.

### 2.2 The lower end, measured

Alasalmi, Koskimäki, et al. ("Better Classifier Calibration for Small Data Sets", [arXiv 2002.10199](https://arxiv.org/html/2002.10199v2), JMLR 2020) tested calibration splits of **64–138 samples** (tabular classifiers): ensemble near-isotonic regression made probability estimates **worse than no calibration on all tested classifiers**, and **even Platt scaling failed to beat the uncalibrated baseline** on every tested data set (it degraded less). Their citation of N&C: "a minimum of about 1000 to 2000 training samples are needed for the calibration data set … to avoid overfitting." Caveat: tabular classifiers, not LLM forecast aggregates; the *direction* of the raw miscalibration there differs (overconfident classifiers vs hedging LLM aggregates). **[adjacent evidence]**

Metaculus's operational choice (§1.2) is a field data point at the boundary: fit per-forecaster only with **≥500 forecasts** (many forecasts per question, so fewer resolved questions than that); below it they did not fit. Adaptive binning (decision tree, ≥30 obs/bin) overfit even at that scale; the 2-parameter sigmoid did not.

### 2.3 Bias/variance picture at the ticket's three sample points

**[inference — synthesis of 2.1–2.2 with forecasting-specific results]**

| N resolved | Platt (2 params) | Binned (fixed equal-count bins) | Isotonic |
|---|---|---|---|
| **~100** | Variance still large; the only measurable adjacent test at 64–138 (§2.2) had it *failing to beat identity*; prior smoothing mandatory if attempted at all | ~10 bins × ~10 obs → each bin's empirical rate carries ±15pp-scale noise; adaptive bin selection is exactly the Roelofs bias trap | Unsafe; overfits to a step function |
| **~500** | **Safe to fit**; expect the tournament-scale gains (Metaculus −.005 to −.016 Brier); Metaculus's effective threshold | Usable as a *diagnostic* (reliability curve) with ~5–10 equal-count bins; not as the deployed map | Still below the ~1000 rule of thumb; not recommended |
| **~1000** | Remains the best evidence-backed choice; parsimony wins ties | Competitive, and needed to *diagnose* non-sigmoidal distortion | Now roughly competitive (N&C crossover); but no tournament evidence for LLM forecasts, and AIA/Metaculus both show the parsimonious route winning |

The deeper point for v1: with only ~10–30 Brier-relevant basis points of headroom (Platt gains are −.016 binary / −.005 MC), an overfit map's downside can easily exceed that entire headroom. Guardrails (prior smoothing, chronological holdout gate, keep-last-good-map) are not optional polish; they are what makes the expected value positive.

---

## 3. Refit policy: cadence, versioning, interaction with extreme capping

### 3.1 The operational precedent: weather postprocessing refits on rolling windows, per forecast type

The most mature operational recalibration regime in existence is ensemble forecast postprocessing. Gneiting, Raftery, Westveld & Goldman, "Calibrated Probabilistic Forecasting Using Ensemble Model Output Statistics and Minimum CRPS Estimation" (Monthly Weather Review 133(5), 2005) introduced EMOS/NGR — regression recalibration fitted by minimizing a proper score — and the operational pattern it established persists: **fit on a rolling window of recent forecast–observation pairs (typically 25–40 days of daily data), refit every forecast cycle, separately per variable/region/lead time** (i.e., *domain-conditional* maps, each with its own adequate sample). See also Thorarinsdottir & Johnson (2012) for wind-gust EMOS with rolling-window refitting; Lerch & Thorarinsdottir (2013) for extensions. **[adjacent-industry precedent]** The mapping to v1: resolutions arrive 100–300/week → a **weekly refit on a rolling window of the last ~1,000–2,000 resolved questions**, conditioned only on things with enough mass (scaffold version; global), with the window kept finite so the map tracks the current model/scaffold rather than averaging over its history.

### 3.2 Cadence triggers beyond the schedule

- **Scaffold or model change ⇒ forced refit + version bump** (and temporarily revert toward identity if the new scaffold's history is short — a new model is a new forecaster; Metaculus fits per forecaster for exactly this reason).
- **Promotion gate:** candidate map must beat the incumbent on the chronological holdout (last ~30% of the fit window) on **both Brier and log loss** — Metaculus's own warning (§1.2) is that strong performers can be *hurt* by recalibration; their published recommendation is to test on historical forecasts first, which is exactly this gate.
- **Drift monitor:** reliability residual per domain tag (Roelofs's variable-based calibration, §2.1) computed on the trailing window; a domain whose residual persistently exceeds the global map's correction band is the trigger for a *separate* fit (only if that domain has ≥500 resolved) or a capping/hedging review.
- No silent refits: every package stores which map version produced it (proposal §6 already reserves `calibration` metadata; §9.3 wants versioned refits — this is that spec).

### 3.3 Interaction with extreme-probability capping

- The landscape doc (§2) already establishes capping as the strongest within-winner differentiator (r=+.48, p=.005). The tail literature (§1.5) says tail frequencies are effectively unestimable at v1 sample sizes — a 1%-bin needs thousands of resolved questions landing in it before its empirical rate means anything. **Therefore the caps are policy, not parameters: fixed bounds, not fitted.**
- **Order: map first, cap last.** AIA's map *extremizes* (§1.1): a legitimately fitted map can push 0.85 → 0.96. The cap is what bounds the damage if the map or the model is wrong in the tails, and log loss (tracked in the track-record endpoint) punishes tail errors hardest. A monotone map cannot reorder forecasts, so capping after the map preserves all ranking information.
- Suggested v1 bounds: clamp to **[0.02, 0.99]** at serve time (asymmetric to acknowledge longshot-style tail bias seen in adjacent crowds/markets, §1.5), revisit only with per-bin evidence at multi-thousand scale. **[inference]**

### 3.4 Versioning

`cal_v{n}` immutable records: {scaffold_version, model(s), method=platt2, parameters (A, B), prior-smoothing flag, fit window [t0, t1], N resolved, N used, holdout Brier/log-loss delta vs incumbent, promotion decision + date}. Keep every `ForecastRun`'s raw (pre-map) probability (already specified in proposal §7) — retro-fitting candidate maps on the full history without re-running forecasts is the cheapest experiment loop available, and is exactly how Metaculus ran its analysis.

---

## 4. Minimum data before fitting: identity until N — what N?

Anchors from the evidence:

- **Below ~150**: the only direct measurement (§2.2) shows even Platt failing to beat identity → **identity + fixed caps**.
- **~500 forecasts**: Metaculus's operational threshold for fitting a per-forecaster Platt map — but that is *forecasts*, not resolved questions; several forecasts per question means fewer independent outcomes. Independent outcomes are what the variance of the fit depends on.
- **~1000–2000**: the N&C guidance for *non-parametric* methods (isotonic/binned as deployed maps).

**Recipe: identity until 300 resolved binary questions** for the current scaffold version, then a smoothed 2-parameter Platt fit gated by chronological holdout. Rationale [inference]: 300 independent resolved outcomes puts a 2-parameter logit fit past the regime where §2.2 found failure (64–138) with ~2× margin, while isotonic/adaptive-binned maps stay off the table until ~1000. v1 hits 300 resolved in ~1–3 weeks at the stated volume — the identity period is short and the cost is bounded (identity forfeits at most the ~0.016 Brier of Platt gain; an overfit map can cost more than that).

Until then, the *fixed* √3 log-odds extremization constant (AIA's deployed choice, justified by Neyman–Roughgarden max-min optimality under the Brier rule) is the evidence-backed default correction for an aggregated LLM forecast — **but only after v1 has measured its own raw reliability curve on ≥100 resolved questions**, because applying a fixed extremizer to a scaffold that is already calibrated (or overconfident, as Xiong et al. found for verbalized confidence — landscape doc §2) would push the wrong way. Safest v1 sequencing: identity → measure → Platt.

---

## 5. What this means for the owner's real questions (the actual ticket question)

1. **Will the loop-fitted map transfer to the owner's arbitrary domains? Partially, and that is acceptable for v1.** The dominant correctable bias of an ensembled LLM scaffold — compression toward 0.5 — is question-agnostic (AIA §1.1; Baron et al. 2014; Satopää et al. 2014), so a global map carries real signal into any domain. The domain-conditional residual does not transfer (AIA's OOD-fit result; judge-audit harm rate 0.34; Ovadia shift degradation), but a 2-parameter monotone map bounds how wrong it can be, and fixed caps bound the tail damage.
2. **Do not fit per-domain maps in v1.** The owner's domains will never reach the ~500-resolved threshold (they're few and heterogeneous); fitting below it is measured to hurt (§2.2). Record a domain tag on every question, monitor per-domain reliability residuals (variable-based calibration), and let the monitor — not a preconception — trigger any future split.
3. **The upgrade path is hierarchical, not partitioned:** when per-domain signal matters, shrink domain maps toward the global map (empirical-Bayes style) or adopt multi-domain temperature scaling (Yu et al., NeurIPS 2022) which converts source-domain heterogeneity into worst-case robustness. Both respect the min-N economics. **[inference]**
4. **The map is scaffold-versioned, not global-time.** A new model is a new forecaster (Metaculus fits per forecaster); every scaffold change restarts the min-N clock for *its* map, falling back to identity (or the fixed extremizer once that scaffold shows hedging).

### Gaps / unverified

- No direct published test of forecasting-calibration transfer across question domains exists (stated plainly in §1); everything quantitative there comes from adjacent tasks (LLM judges, ML vision shift, weather) or single-system ablations (AIA).
- Phan et al. 0.0999→0.0934 Platt result: fit/evaluation split unclear, possibly in-sample **[unverified]**.
- The √3 fixed-extremization value is derived for aggregating *independent-ish* forecasters under Brier; v1's ensemble members are correlated runs of similar pipelines, so the optimal constant for us is plausibly smaller — measure, don't assume. **[inference]**
- Metaculus's analysis did not report fitted Platt parameter directions (extremize vs hedge) per bot **[not published]**.
- Exact clamp bounds [0.02, 0.99] are judgment, not derived.

---

## Sources (primary unless noted)

**Forecasting-system calibration**
- AIA Forecaster Technical Report (Alur et al., Nov 2025) — https://arxiv.org/abs/2511.07678 (calibration ablation incl. OOD-fitted Platt; √3 fixed coefficient)
- Metaculus, Calibration Adjustment Analysis (LukeBeukelman, May 2026) — https://www.metaculus.com/notebooks/43356/calibration-adjustment-analysis (the −.016 primary source; per-forecaster, chronological split, ≥500-forecast threshold)
- Metaculus, AI Forecasting in 2026: What 11 Analyses Say — https://www.metaculus.com/notebooks/43363/ai-forecasting-in-2026 (Phan et al. 177-question Platt result as summarized there)
- Halawi et al. 2024 (question set used for AIA's OOD fit) — https://arxiv.org/abs/2402.18563

**Aggregation / extremization (why the global bias is question-agnostic)**
- Satopää, Baron, Foster, Tetlock, Tetlock & Ungar 2014, Int. J. Forecasting — https://ideas.repec.org/a/eee/intfor/v30y2014i2c344-356.html
- Baron, Mellers, Tetlock, Stone & Ungar 2014, Decision Analysis — https://pubsonline.informs.org (PDF via https://faculty.wharton.upenn.edu)
- Neyman & Roughgarden, From Proper Scoring Rules to Max-Min Optimal Forecast Aggregation — https://arxiv.org/abs/2102.07081

**Calibration-transfer / distribution shift**
- Afrin & Shihab 2026, Auditing Cross-Domain Recalibration of LLM Judges — https://arxiv.org/abs/2609.27954 (13 judges × 8 domains × 1,176 transfers; harm 0.34 vs 0.09 @16 labels)
- Ovadia et al. 2019, NeurIPS — https://arxiv.org/abs/1906.02530
- Park et al., Post-hoc Uncertainty Calibration for Domain Drift — https://arxiv.org/html/2012.10988v2
- Yu, Bates et al., Multi-domain Temperature Scaling, NeurIPS 2022 — https://proceedings.neurips.cc/paper_files/paper/2022/hash/b054fadf1ccd80b37d465f6082629934-Abstract-Conference.html

**Small-sample recalibration**
- Platt 1999, Probabilistic Outputs for SVMs — in Advances in Large Margin Classifiers (MIT Press); summary + smoothing via https://blog.trainindata.com/complete-guide-to-platt-scaling and the robust-Platt vignette https://rdrr.io/github/bioinf-jku/platt/f/inst/doc/platt.pdf
- Niculescu-Mizil & Caruana 2005, ICML — https://www.cs.cornell.edu/~alexn/papers/calibration.icml05.crc.rev3.pdf (isotonic ≳1000; sigmoid small-N)
- Guo et al. 2017, ICML — https://arxiv.org/abs/1706.04599
- Alasalmi, Koskimäki et al., Better Classifier Calibration for Small Data Sets — https://arxiv.org/abs/2002.10199 (JMLR 2020)
- Roelofs, Cain, Shlens & Mozer, ICML 2022 — https://arxiv.org/abs/2012.08668

**Operational refit precedent & platform calibration traces**
- Gneiting, Raftery, Westveld & Goldman 2005, Monthly Weather Review — https://journals.ametsoc.org/view/journals/mwre/33/5/mwr2904.1.xml (EMOS/NGR; rolling-window operational refitting pattern)
- Rethink Priorities 2021, forecast quantity/quality on Metaculus — https://rethinkpriorities.org/research-area/how-does-forecast-quantity-impact-forecast-quality-on-metaculus (>1yr-horizon miscalibration)
- Metaculus, Exploring Metaculus's AI Track Record (2023) — https://www.metaculus.com/notebooks/16708/exploring-metaculuss-ai-track-record
- Sabharwal 2026, Favourite Longshot Bias (44,116 Polymarket contracts) — https://www.mahirsabharwal.com/blog/favourite-longshot-bias
- Allen, Koh, Segers & Ziegel, Tail calibration of probabilistic forecasts — https://arxiv.org/abs/2407.03167
