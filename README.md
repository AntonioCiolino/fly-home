# FLY-HOME-01

## Why we started Fly Home

We wanted to see whether a simulated fruit fly could build a habit of returning to a place it had visited. A fly might revisit a cell because it remembers a rewarding spot, because an odor or substrate draws it back, or simply because it wanders through again. In an ordinary run, those returns can look the same.

Fly Home makes that question interactive. You can let flies explore, clear food and odors from the arena, and count which previous visitors leave and come back to the selected cell. You can compare trials with learning or mating cues turned on and off. The experiment uses simplified behaviors and circuits drawn from fruit fly connectome data to explore what produces repeated returns in the simulation.

We also wanted to experiment with the fly connectome, a map of connections between neurons. We used small pieces of that wiring in the simulation to see how changing a circuit or its inputs affects where a fly goes. That experiment grew alongside a broader question from our conversation: what is home, and how does a place become a source of stability? The connection is tangential. In Fly Home, we can observe one small piece of that idea: whether the same place keeps showing up in a fly’s movements after food and odors are cleared.

## What to look for

Let flies explore and visit a cell, then select that cell and use **Clear food and odors to test returns**. The arena tracks which previous visitors leave and come back. Compare repeated trials with mating cues enabled and disabled. Substrate stays in place during this test, and flies can return by chance. Returns are a measure of site fidelity under the simulated conditions.

## Model

Small neural circuits use connections extracted from the female FlyWire FAFB and Janelia Male CNS datasets. The browser evaluates the circuits locally. Connection gains, sensory inputs, and the conversion from activity into actions are simulation assumptions.

## Run locally

```sh
git clone https://github.com/AntonioCiolino/fly-home.git
cd fly-home
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the local arena](http://127.0.0.1:8000). The HTTP server lets the browser fetch the circuit JSON files. Simulation runs in JavaScript with no Python backend or connectome API calls.

## Handoff

The browser build is on `main`: `index.html`, `arena.css`, `live.js`, and the DM1, VA1v, oviDN, and Male CNS pursuit circuit JSON files. All four JSON files were verified to parse and match references in `live.js`. A fresh-clone browser smoke test is still pending. This is a copy of the browser files. The separate Python experiment is outside this repo.

For the next experiment, compare circuit-driven steering under matched starts and random seeds. Change one pathway gain for one fly, retain an unmodified control, and measure food finding separately from repeated returns after food and odors are cleared. Move substrate as a separate test to distinguish site fidelity from preference for a substrate. Keep shared wiring and per-fly weight overrides separate.
