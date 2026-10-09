# Intentionally retained legacy fitness routes

On `cursor/nvrtrack-command-center-8c10` the **active product surface** is the business Command Center. Fitness code stays in the tree so `archive/nvr-nutrition` and tag `nvr-nutrition-v1-freeze` remain the canonical Nutrition product.

These routes are **not** in primary desktop or mobile navigation. They still exist for the archive and for direct URLs:

| Route | Role |
| --- | --- |
| `/nutrition` | Archived Nutrition V2 |
| `/training` | Archived Training |
| `/progress` | Archived progress photos / measurements |
| `/profile` | Archived fitness profile |
| `/onboarding` | Archived training/nutrition onboarding |

`/` now redirects to `/today`. Do not treat that as deleting the Nutrition Home from git history; the original Home lives on the archive branch.
