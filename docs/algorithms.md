# Cold start, correction, and confidence

Cold start uses static per-kind lead multipliers, a +0.2 regional bonus for mid-resolution models, +0.3 for regional convection-allowing models, and a precipitation boost for CAMs. Values are normalized after models with no coverage, no value, or exceeded horizon are removed. AI products remain separate registry entries and do not receive a special “AI is accurate” assumption.

Numeric variables use a weighted mean and weighted standard deviation. Wind direction uses a unit-vector circular mean and circular standard deviation. WMO weather codes are grouped by severity and selected by weighted severity mode, then the most-weighted code inside that severity. Numeric code averaging is deliberately forbidden.

Confidence is a bounded agreement signal multiplied by an effective independent-model count. Same-family products receive only 0.25 additional independent credit after the first. It is not a guarantee.

V1 calibration is optional and conservative. Samples are grouped by location/model/variable/lead band/season-compatible history; recent observations receive exponential decay. A minimum sample gate prevents automatic correction, and correction magnitude is clamped. Temperature/humidity/pressure use rolling bias correction. Precipitation probability is designed for Brier/reliability/hit/miss/false-alarm scores; exact-amount correction remains intentionally conservative. Disabling calibration returns raw fusion. The parameter shape leaves room for ridge regression, isotonic calibration and LightGBM later without introducing a model framework now.

The Open-Meteo adapter exposes three normalized paths: live `/v1/forecast`, exact `/v1/forecast` on the Single Runs host with `run=`, and `/v1/archive` historical observations. This follows Open-Meteo’s documented separation between stitched live forecasts, exact initialized runs, and reanalysis/archive data; provider JSON never crosses into the domain layer.
