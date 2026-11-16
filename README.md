# FLY-HOME-01

An interactive experiment in fruit fly navigation. Can simulated flies develop a habit of returning to a particular place through sensing, learning, and social cues?

[Open the interactive arena](https://fly-home-01.heroichyacinth.chatgpt.site).

## What to look for

Let flies explore and visit a cell, then select that cell and use **Clear food and odors to test returns**. The arena tracks which previous visitors leave and come back. Compare repeated trials with mating cues enabled and disabled. Substrate stays in place during this test, and flies can return by chance. Returns are a measure of site fidelity under the simulated conditions.

## Model

Small neural circuits use connections extracted from the female FlyWire FAFB and Janelia Male CNS datasets. The browser evaluates the circuits locally. Connection gains, sensory inputs, and the conversion from activity into actions are simulation assumptions.

This initial GitHub commit contains the project overview. The simulator source and its existing history are pending transfer from the arena's source repository.
