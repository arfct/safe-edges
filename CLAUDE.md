# CLAUDE.md

This repo follows the Artifact Primer: https://github.com/arfct/ops/tree/main/primer

- Standards (style, commits, branches): https://github.com/arfct/ops/blob/main/primer/standards.md
- Work tracking: GitHub Issues in this repo — https://github.com/arfct/ops/blob/main/primer/issues.md
- Bugs: https://github.com/arfct/ops/blob/main/primer/bugs.md · Deployment: https://github.com/arfct/ops/blob/main/primer/deployment.md
- Agent conventions and boundaries: https://github.com/arfct/ops/blob/main/primer/agents.md

## This repo

safe-edges gives web pages true safe areas on iPhone, starting with iPhone Duo, where Safari lays pages out beside its control strip and reports no inset. `safe-edges.js` is the library, `tailwind/safe-edges.css` its Tailwind v4 layer, `index.html` the tester and `examples/` the demo apps. `npm install` then `npm run build` compiles `examples/app.css`, which is committed. GitHub Pages serves `main` at the repo root. Measurements in README.md come from the iPhone Duo simulator (iOS 27.1) and device screenshots; mark anything new as measured or unverified. Credit no third-party products or people in code, docs or commits.
