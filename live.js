(() => {
  const get = id => document.getElementById(id);
  const canvas = get('live-grid');
  const ctx = canvas.getContext('2d');
  let size, count, adjacent, directionOffsets;
  const populationLimit = 80;
  const freshFood = 3;
  const spoiledFood = freshFood / 4;
  let brood, flies, food, field, foodOdor, tick, timer, circuit, selectedCell, selectionVersion = 0;
  let matingCircuit, layingCircuit, substrate, eggSites, expiredEggs, deaths, courtshipSignal = null;
  const matingCueDelay = 120;
  let matingCue, visits, returnProbe, deposits, nextFlyId;
  let pursuitCircuit, pursuingMales = 0;
  const bounded = value => Math.max(-1, Math.min(1, value));

  function draw() {
    for (let cell = 0; cell < count; cell++) {
      const x = cell % size * 20, y = Math.floor(cell / size) * 20;
      ctx.fillStyle = '#182820';
      ctx.fillRect(x, y, 20, 20);
      ctx.fillStyle = 'rgba(126,214,146,' + Math.min(0.85, field[cell] / 4) + ')';
      ctx.fillRect(x + 1, y + 1, 18, 18);
      ctx.fillStyle = 'rgba(242,184,93,' + Math.min(0.65, foodOdor[cell] * 0.24) + ')';
      ctx.fillRect(x + 1, y + 1, 18, 18);
      if (substrate.has(cell)) {
        ctx.strokeStyle = '#b194e5';
        ctx.strokeRect(x + 1, y + 1, 18, 18);
      }
      if (matingCue[cell] >= 0.015) {
        ctx.fillStyle = 'rgba(106,203,245,' + Math.min(0.75, matingCue[cell]) + ')';
        ctx.fillRect(x + 4, y + 4, 12, 12);
      }
      const quality = food.get(cell) / freshFood;
      if (quality > 0) {
        ctx.fillStyle = 'rgba(242,184,93,' + quality + ')';
        ctx.fillRect(x + 6, y + 6, 8, 8);
      }
    }
    const stages = {egg: 0, larva: 0, pupa: 0};
    for (const {cell, laidAt} of brood) {
      const age = tick - laidAt;
      const stage = age < 50 ? 'egg' : age < 150 ? 'larva' : 'pupa';
      stages[stage]++;
      ctx.fillStyle = {egg: '#fff5cb', larva: '#f5a164', pupa: '#d5a5fa'}[stage];
      ctx.fillRect(cell % size * 20 + 3, Math.floor(cell / size) * 20 + 13, 5, 5);
    }
    const occupancy = new Map();
    let young = 0, females = 0, males = 0;
    for (const {cell, sex, matureAt} of flies) {
      const immature = tick < matureAt;
      if (immature) young++;
      else if (sex === 'female') females++;
      else males++;
      const index = occupancy.get(cell) ?? 0;
      occupancy.set(cell, index + 1);
      const x = cell % size * 20 + 2.5 + (index % 5) * 3.75;
      const y = Math.floor(cell / size) * 20 + 3 + Math.floor(index / 5) * 4;
      ctx.fillStyle = immature ? '#f7ff85' : sex === 'female' ? '#f5bde7' : '#b1dcff';
      ctx.beginPath();
      if (immature) {
        ctx.moveTo(x, y - 2.2);
        ctx.lineTo(x + 2.2, y);
        ctx.lineTo(x, y + 2.2);
        ctx.lineTo(x - 2.2, y);
        ctx.closePath();
      } else if (sex === 'female') ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
      else ctx.rect(x - 1.7, y - 1.7, 3.4, 3.4);
      ctx.fill();
    }
    get('population').textContent = females + ' mature female · ' + males +
      ' mature male · ' + young + ' young adults' +
      ' male · ' + stages.egg + ' eggs · ' + stages.larva + ' larvae · ' + stages.pupa + ' pupae';
    if (matingCircuit) {
      get('courtship').textContent = courtshipSignal === null ?
        'VA1v active · Awaiting an eligible encounter' :
        'VA1v output ' + courtshipSignal.toFixed(2) + ' · Mating chance ' +
          (10 * courtshipSignal).toFixed(1) + '% per eligible tick';
    }
    if (layingCircuit) {
      get('laying').textContent = 'oviDN active · Selected cell: ' +
        (substrate.has(selectedCell) ? 'soft, moist' : 'plain') + ' · Eggs laid: food + substrate ' + eggSites.both +
        ' · substrate alone ' + eggSites.substrate + ' · food alone ' + eggSites.food +
        ' · plain ' + eggSites.plain;
    }
    get('pending-eggs').textContent = flies.filter(fly => fly.eggExpiresAt !== null).length;
    get('expiry').textContent = deaths + ' adult deaths · ' + expiredEggs + ' carried eggs lost';
    if (pursuitCircuit) {
      get('pursuit-status').textContent = get('male-pursuit').checked ?
        'Male CNS pursuit active · ' + pursuingMales + ' males sensing a nearby female' :
        'Male CNS pursuit off';
    }
    get('mating-cue-status').textContent = deposits + ' deposits · ' +
      flies.filter(fly => fly.depositAt !== null).length + ' females carrying a recent mating cue';
    get('probe-status').textContent = returnProbe ?
      returnProbe.returned.size + ' of ' + returnProbe.visitors.size +
        ' then-living prior visitors returned to the marked cell after leaving · ' +
        (tick - returnProbe.started) + ' ticks since food and chemical cues were cleared' :
      (visits.get(selectedCell)?.size ?? 0) + ' individual flies have visited the selected cell';
    if (returnProbe) {
      ctx.strokeStyle = '#eff6ff';
      ctx.strokeRect((returnProbe.cell % size) * 20 + 2,
        Math.floor(returnProbe.cell / size) * 20 + 2, 16, 16);
    }
    get('live-step').value = tick;
    const odor = foodOdor[selectedCell] + field[selectedCell];
    get('signal').textContent = 'Selected cell odor ' + odor.toFixed(2) +
      ' · Odor relay output ' + response(odor).toFixed(2);
  }

  function adult(sex, cell, matureAt) {
    return {id: nextFlyId++, sex, cell, depositAt: null, heading: Math.floor(Math.random() * 4), motor: [0, 0, 0, 0], matureAt, readyAt: matureAt, eggExpiresAt: null, diesAt: tick + 3000, hungryTicks: 0, energy: 0.6, memory: new Float64Array(count)};
  }

  function reset() {
    const center = Math.floor(size / 2);
    const centerCell = center + center * size;
    brood = [];
    matingCue = new Float64Array(count);
    visits = new Map();
    returnProbe = null;
    deposits = nextFlyId = 0;
    get('return-probe').disabled = false;
    substrate = new Set();
    eggSites = {both: 0, substrate: 0, food: 0, plain: 0};
    deaths = expiredEggs = pursuingMales = 0;
    tick = 0;
    courtshipSignal = null;
    flies = Array.from({length: 20}, (_, index) => adult(
      index % 2 === 0 ? 'female' : 'male', Math.floor(Math.random() * count), 0
    ));
    field = new Float64Array(count);
    foodOdor = new Float64Array(count);
    food = new Map([[centerCell, freshFood]]);
    for (const [cell, strength] of food) foodOdor[cell] = strength;
    selectedCell = centerCell;
    recordVisits();
    draw();
  }

  function recordVisits() {
    for (const fly of flies) {
      if (returnProbe) {
        if (!returnProbe.visitors.has(fly.id)) continue;
        if (fly.cell !== returnProbe.cell) returnProbe.left.add(fly.id);
        else if (returnProbe.left.has(fly.id)) returnProbe.returned.add(fly.id);
      } else {
        if (!visits.has(fly.cell)) visits.set(fly.cell, new Set());
        visits.get(fly.cell).add(fly.id);
      }
    }
  }

  function startReturnProbe() {
    if (returnProbe) return;
    const priorVisitors = visits.get(selectedCell);
    returnProbe = {cell: selectedCell, started: tick,
      visitors: new Set(flies.filter(fly => priorVisitors?.has(fly.id)).map(fly => fly.id)),
      left: new Set(), returned: new Set()};
    food.clear();
    foodOdor.fill(0);
    field.fill(0);
    matingCue.fill(0);
    for (const fly of flies) fly.depositAt = null;
    get('return-probe').disabled = true;
    recordVisits();
    draw();
  }

  function response(odor) {
    if (!circuit) return odor;
    return 3 * circuitOutput(circuit, odor / 3);
  }

  function circuitOutput(graph, input, outputDrive = 0) {
    let activity = new Float64Array(graph.nodes.length);
    for (let step = 0; step < 8; step++) {
      const next = new Float64Array(activity.length);
      for (const [from, to, weight] of graph.edges) next[to] += activity[from] * weight;
      next[graph.input] = bounded(input);
      next[graph.output] += outputDrive;
      activity = next.map(bounded);
    }
    return activity[graph.output];
  }

  function layingActivity(onSubstrate) {
    const inhibition = onSubstrate ? 0.30 : 0.72;
    return Math.max(0, circuitOutput(layingCircuit, inhibition, 0.8));
  }

  function distance(from, to) {
    return Math.abs(from % size - to % size) +
      Math.abs(Math.floor(from / size) - Math.floor(to / size));
  }

  // Clockwise sensory channels in arena coordinates: north, east, south, west.

  function sense(fly, femaleCells) {
    const here = fly.cell;
    const odorHere = foodOdor[here] + field[here];
    const neighbors = directionOffsets.map(offset => {
      const cell = here + offset;
      return adjacent[here].includes(cell) ? cell : null;
    });
    const mate = [0, 0, 0, 0];
    for (const {cell, recentMating} of femaleCells) {
      const separation = distance(here, cell);
      if (!separation || separation > 3) continue;
      const strength = (1 - separation / 4) * (recentMating ? 0.35 : 1);
      const dx = cell % size - here % size;
      const dy = Math.floor(cell / size) - Math.floor(here / size);
      if (dx) {
        const channel = dx > 0 ? 1 : 3;
        mate[channel] = Math.max(mate[channel], strength * Math.abs(dx) / separation);
      }
      if (dy) {
        const channel = dy > 0 ? 2 : 0;
        mate[channel] = Math.max(mate[channel], strength * Math.abs(dy) / separation);
      }
    }
    return {
      neighbors,
      mate,
      odor: neighbors.map(cell => cell === null ? 0 : foodOdor[cell] + field[cell] - odorHere),
      matingOdor: neighbors.map(cell => cell === null ? 0 : matingCue[cell] - matingCue[here]),
      moisture: neighbors.map(cell => cell !== null && substrate.has(cell) ? 1 : 0),
      memory: neighbors.map(cell => cell === null || !get('live-learning').checked ? 0 : fly.memory[cell]),
      contactFood: (food.get(here) ?? 0) / freshFood,
      contactMoisture: substrate.has(here),
    };
  }

  function decide(fly, cues, noise = Math.random) {
    const carrying = fly.sex === 'female' && fly.eggExpiresAt !== null;
    const substrateDrive = carrying && layingCircuit && get('substrate-steering').checked;
    const hunger = 1 - fly.energy;
    const feedingOutput = bounded(2 * hunger + cues.contactFood - 1.24);
    const feed = cues.contactFood > 0 && feedingOutput > 0;
    const lay = carrying && layingCircuit &&
      noise() < 0.10 * layingActivity(cues.contactMoisture);
    if (lay || feed) {
      fly.motor.fill(0);
      return {feed: feed && !lay, lay: Boolean(lay), turn: 0, walk: false};
    }

    // These sensory-to-motor projections and their gains are model assumptions.
    for (let direction = 0; direction < 4; direction++) {
      const foodDrive = response(cues.odor[direction]) * (0.35 + hunger);
      const moistureDrive = substrateDrive && !cues.contactMoisture ?
        1.15 * cues.moisture[direction] : 0;
      const courtshipDrive = cues.mate[direction] > 0 ?
        2.2 * circuitOutput(pursuitCircuit, cues.mate[direction]) : 0;
      fly.motor[direction] = bounded(0.25 * fly.motor[direction] +
        foodDrive + 1.2 * cues.matingOdor[direction] + moistureDrive + courtshipDrive + 0.6 * cues.memory[direction] +
        0.32 * noise() - 0.16 + (direction === fly.heading ? 0.04 : 0));
    }
    // Competing motor outputs select a heading. Negative activity means rest.
    let heading = fly.heading;
    for (let direction = 0; direction < 4; direction++) {
      if (fly.motor[direction] > fly.motor[heading]) heading = direction;
    }
    return {feed: false, lay: false, turn: (heading - fly.heading + 4) % 4,
      walk: fly.motor[heading] > 0};
  }

  function advance() {
    const pursuitEnabled = pursuitCircuit && get('male-pursuit').checked;
    const femaleCells = pursuitEnabled ? flies.filter(fly =>
      fly.sex === 'female' && fly.matureAt <= tick
    ).map(fly => ({cell: fly.cell, recentMating: fly.depositAt !== null})) : [];
    matingCue = diffuse(matingCue, 0.95, 0.04);
    for (const fly of flies) {
      if (fly.depositAt === null || tick < fly.depositAt) continue;
      matingCue[fly.cell] += 3;
      fly.depositAt = null;
      deposits++;
    }
    const layingRequests = new Set();
    pursuingMales = 0;
    for (const fly of flies) {
      const canPursue = pursuitEnabled && fly.sex === 'male' &&
        fly.readyAt <= tick && fly.energy >= 0.45;
      const cues = sense(fly, canPursue ? femaleCells : []);
      const action = decide(fly, cues);
      if (cues.mate.some(value => value > 0)) pursuingMales++;
      const nutrition = action.feed ? cues.contactFood : 0;
      fly.energy = Math.min(1, Math.max(0, fly.energy - 0.01) + 0.2 * nutrition);
      fly.hungryTicks = fly.energy === 0 ? fly.hungryTicks + 1 : 0;
      if (get('live-learning').checked) {
        fly.memory[fly.cell] += 0.2 * (nutrition - fly.memory[fly.cell]);
      }
      if (action.lay) layingRequests.add(fly);
      fly.heading = (fly.heading + action.turn) % 4;
      const destination = cues.neighbors[fly.heading];
      if (action.walk && destination !== null) fly.cell = destination;
    }
    field = diffuse(field, 0.87, 0.12);
    // Match the pulse retention over eight ticks for a longer odor half-life.
    const foodDecay = 0.99 ** (1 / 8);
    foodOdor = diffuse(foodOdor, foodDecay - 0.30, 0.30);
    for (const [cell, strength] of food) {
      const remaining = strength * foodDecay;
      if (remaining < spoiledFood) {
        food.delete(cell);
      } else {
        food.set(cell, remaining);
        foodOdor[cell] = Math.max(foodOdor[cell], remaining);
      }
    }
    tick += 1;
    flies = flies.filter(fly => {
      const dead = tick >= fly.diesAt || fly.hungryTicks >= 600;
      if (dead) deaths++;
      if (fly.eggExpiresAt !== null && (dead || tick >= fly.eggExpiresAt)) {
        expiredEggs++;
        fly.eggExpiresAt = null;
      }
      return !dead;
    });
    reproduce(layingRequests);
    recordVisits();
    draw();
  }

  function reproduce(layingRequests) {
    courtshipSignal = null;
    brood = brood.filter(({cell, laidAt}) => {
      if (tick - laidAt < 250) return true;
      flies.push(adult(Math.random() < 0.5 ? 'female' : 'male', cell, tick + 100));
      return false;
    });
    const occupiedNurseries = new Set(brood.map(young => young.cell));
    for (const fly of flies) {
      if (flies.length + brood.length >= populationLimit) break;
      if (!layingRequests.has(fly) || fly.eggExpiresAt === null || occupiedNurseries.has(fly.cell)) continue;
      brood.push({cell: fly.cell, laidAt: tick});
      occupiedNurseries.add(fly.cell);
      fly.eggExpiresAt = null;
      const onFood = food.has(fly.cell), onSubstrate = substrate.has(fly.cell);
      const site = onFood ? (onSubstrate ? 'both' : 'food') :
        (onSubstrate ? 'substrate' : 'plain');
      eggSites[site]++;
    }
    if (!get('reproduction').checked) return;

    const malesByCell = new Map();
    for (const fly of flies) {
      if (fly.sex !== 'male' || fly.energy < 0.75 || fly.readyAt > tick) continue;
      if (!malesByCell.has(fly.cell)) malesByCell.set(fly.cell, []);
      malesByCell.get(fly.cell).push(fly);
    }
    for (const female of flies) {
      if (female.sex !== 'female' || female.energy < 0.75 || female.readyAt > tick ||
          female.eggExpiresAt !== null) continue;
      const availableMales = malesByCell.get(female.cell);
      if (!availableMales?.length) continue;
      // Energy is a simple proxy for local cue strength in this arena.
      const output = matingCircuit ? Math.max(0, circuitOutput(matingCircuit, female.energy)) : null;
      if (output !== null) courtshipSignal = Math.max(courtshipSignal ?? 0, output);
      const chance = output === null ? 0.05 : 0.10 * output;
      if (Math.random() >= chance) continue;
      const male = availableMales.pop();
      female.energy -= 0.4;
      male.energy -= 0.2;
      female.readyAt = male.readyAt = tick + 100;
      female.eggExpiresAt = tick + 600;
      if (!returnProbe && get('mating-cues').checked) female.depositAt = tick + matingCueDelay;
    }
  }

  function diffuse(values, retention, spread) {
    const next = new Float64Array(count);
    values.forEach((value, cell) => {
      next[cell] += value * retention;
      for (const neighbor of adjacent[cell]) next[neighbor] += value * spread / adjacent[cell].length;
    });
    return next;
  }

  function setRunning(running) {
    clearInterval(timer);
    timer = running ? setInterval(advance, 100) : null;
    get('live-play').textContent = running ? 'Pause' : 'Play';
  }

  const sizeControl = get('arena-size');
  function resizeArena() {
    size = Number(sizeControl.value);
    count = size ** 2;
    directionOffsets = [-size, 1, size, -1];
    adjacent = Array.from({length: count}, (_, cell) => [
      ...(cell % size ? [cell - 1] : []),
      ...(cell % size < size - 1 ? [cell + 1] : []),
      ...(cell >= size ? [cell - size] : []),
      ...(cell < count - size ? [cell + size] : [])
    ]);
    canvas.width = canvas.height = size * 20;
    get('arena-dimensions').textContent = size + ' × ' + size;
    reset();
  }

  sizeControl.onchange = resizeArena;
  resizeArena();
  setRunning(true);
  get('return-probe').onclick = startReturnProbe;
  get('mating-cues').onchange = () => {
    if (!get('mating-cues').checked) {
      matingCue.fill(0);
      for (const fly of flies) fly.depositAt = null;
    }
    draw();
  };
  get('live-play').onclick = () => setRunning(timer === null);
  get('live-reset').onclick = reset;
  canvas.onclick = event => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * size / rect.width);
    const y = Math.floor((event.clientY - rect.top) * size / rect.height);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const cell = y * size + x;
    selectedCell = cell;
    if (returnProbe) {
      draw();
      return;
    }
    if (get('stimulus').value === 'food') {
      food.set(cell, freshFood);
      foodOdor[cell] = freshFood;
    } else if (get('stimulus').value === 'substrate') {
      substrate.add(cell);
    } else {
      field[cell] += 16;
    }
    draw();
  };

  function compileCircuit(graph) {
    const {nodes, edges, input, output, source} = graph;
    if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 128 ||
        nodes.some(id => typeof id !== 'string' || !id) ||
        new Set(nodes).size !== nodes.length ||
        !nodes.includes(input) || !nodes.includes(output) || input === output ||
        typeof source !== 'string' || !source.trim() ||
        !Array.isArray(edges) || edges.length < 1 || edges.length > 512) {
      throw new Error('Expected source, nodes, input, output and edges.');
    }
    const indexed = edges.map(edge => {
      if (!Array.isArray(edge) || edge.length !== 3) throw new Error('Invalid edge.');
      const [from, to, weight] = edge;
      if (!nodes.includes(from) || !nodes.includes(to) || !Number.isFinite(weight) ||
          Math.abs(weight) > 1) throw new Error('Invalid endpoint or weight.');
      return [nodes.indexOf(from), nodes.indexOf(to), weight];
    });
    return {nodes, edges: indexed, input: nodes.indexOf(input), output: nodes.indexOf(output)};
  }

  function installCircuit(graph) {
    circuit = compileCircuit(graph);
    get('engine').textContent = 'Loaded circuit · ' + graph.source;
    draw();
  }

  async function loadCircuit(read) {
    const version = ++selectionVersion;
    try {
      const graph = await read();
      if (version === selectionVersion) installCircuit(graph);
    } catch (error) {
      if (version !== selectionVersion) return;
      get('engine').textContent = 'Circuit rejected · ' + error.message +
        (circuit ? ' · Previous circuit still active.' : ' · Baseline still active.');
    }
  }

  get('baseline').onclick = () => {
    selectionVersion++;
    circuit = null;
    get('circuit').value = '';
    get('engine').textContent = 'Baseline controller';
    draw();
  };
  get('dm1').onclick = () => loadCircuit(async () => {
    const result = await fetch('flywire-dm1.json');
    if (!result.ok) throw new Error('Could not load the bundled circuit.');
    return result.json();
  });
  get('dm1').onclick();

  async function loadLayingCircuit() {
    try {
      const result = await fetch('flywire-ovidn.json');
      if (!result.ok) throw new Error('oviDN download failed');
      layingCircuit = compileCircuit(await result.json());
      draw();
    } catch {
      get('laying').textContent = 'oviDN unavailable · Egg laying paused';
    }
  }
  loadLayingCircuit();

  get('male-pursuit').onchange = () => {
    pursuingMales = 0;
    draw();
  };
  async function loadPursuitCircuit() {
    try {
      const result = await fetch('mcns-male-pursuit.json');
      if (!result.ok) throw new Error('Male CNS download failed');
      pursuitCircuit = compileCircuit(await result.json());
      get('male-pursuit').disabled = false;
      draw();
    } catch {
      get('pursuit-status').textContent = 'Male CNS pursuit unavailable';
    }
  }
  loadPursuitCircuit();

  get('flywire-mating').onchange = async event => {
    const control = event.currentTarget;
    if (!control.checked) {
      matingCircuit = null;
      get('courtship').textContent = 'Baseline mating · 5% per eligible tick';
      return;
    }
    control.disabled = true;
    try {
      const result = await fetch('flywire-va1v.json');
      if (!result.ok) throw new Error('VA1v download failed');
      matingCircuit = compileCircuit(await result.json());
      draw();
    } catch (error) {
      control.checked = false;
      get('courtship').textContent = 'VA1v unavailable · Baseline mating active';
    } finally {
      control.disabled = false;
    }
  };
  get('circuit').onchange = event => {
    const file = event.target.files[0];
    if (!file) return;
    return loadCircuit(async () => {
      if (file.size > 100000) throw new Error('Use a circuit under 100 KB.');
      return JSON.parse(await file.text());
    });
  };
})();
