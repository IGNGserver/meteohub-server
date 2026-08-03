# ADR 0003: Sample-gated, bounded calibration

Status: accepted

V1 uses static cold-start weights and a rolling exponentially weighted bias only after a minimum sample count. Corrections have a hard bound and can be disabled globally. Precipitation probability is evaluated with Brier/reliability-style metrics rather than aggressive rain-amount rewriting. Dynamic weight updates must be smoothed and capped; no model may take 100% of the blend. This prevents a sparse or changed model version from producing a confident local overfit.
