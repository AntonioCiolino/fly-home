# FLY-HOME-01

An interactive experiment in fruit fly navigation. Can simulated flies develop a habit of returning to a particular place through sensing, learning, and social cues?

[Open the interactive arena](https://fly-home-01.heroichyacinth.chatgpt.site).

## What to look for

Let flies explore and visit a cell, then select that cell and use **Clear food and odors to test returns**. The arena tracks which previous visitors leave and come back. Compare repeated trials with mating cues enabled and disabled. Substrate stays in place during this test, and flies can return by chance. Returns are a measure of site fidelity under the simulated conditions.

## Model

Small neural circuits use connections extracted from the female FlyWire FAFB and Janelia Male CNS datasets. The browser evaluates the circuits locally. Connection gains, sensory inputs, and the conversion from activity into actions are simulation assumptions.

## Run locally

```sh
git clone https://github.com/AntonioCiolino/fly-home.git
cd fly-home
python3 -m http.server 8000
```

Open http://localhost:8000. The HTTP server lets the browser fetch the circuit JSON files. Simulation runs in JavaScript with no Python backend or connectome API calls.

## Handoff

The browser build is on `main`: `index.html`, `live.js`, and the DM1, VA1v, oviDN, and Male CNS pursuit circuit JSON files. All four JSON files were verified to parse and match references in `live.js`. A fresh-clone browser smoke test is still pending. This is a copy of the browser files. The original Sites commit history and separate Python experiment are still outside this repo.

For the next experiment, compare circuit-driven steering under matched starts and random seeds. Change one pathway gain for one fly, retain an unmodified control, and measure food finding separately from repeated returns after food and odors are cleared. Move substrate as a separate test to distinguish site fidelity from preference for a substrate. Keep shared wiring and per-fly weight overrides separate.
