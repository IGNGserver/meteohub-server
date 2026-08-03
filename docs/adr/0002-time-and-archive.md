# ADR 0002: Preserve publication time separately from receipt time

Status: accepted

Forecast analysis is only valid when comparing the forecast issue/run time to its valid time. Every raw value keeps both `runAt` and `fetchedAt`; `leadHours` is calculated from run time. If a provider omits a run time, MeteoHub stores an update-cadence floor as an approximation and labels the source version. Tests explicitly reject treating a later fetch as an earlier forecast.
