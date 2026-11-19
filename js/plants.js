/* Plant facts for Yardgrid. Numbers come from the sources named on each record.
   Grid counts: SDSU Extension P-00379 (March 2026) when that sheet lists the crop.
   Otherwise the lower density from UF/IFAS Leon County or CSU GardenNotes #720.
   Days and frost timing prefer CSU GardenNotes #720. See SOURCES.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YardPlants = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const plants = [
    {
      id: 'carrot', name: 'Carrot', group: 'Vegetable', emoji: '🥕',
      perSq: 16, spanC: 1, spanR: 1,
      sun: 'Can get by with less than a few hours (UMN raised beds).',
      days: '70',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. SDSU’s sample tables list 55–80 and 45–65 in two different beds.',
      gridNote: '16 per square at 3 in. SDSU P-00379 and UF/IFAS. CSU lists 2–3 in.',
      direct: [-14, 0], directNote: 'Semi-hardy: as early as 0–2 weeks before the average last spring frost (CSU).',
      method: 'Direct sow. Carrots do not like transplanting (UMN).'
    },
    {
      id: 'radish', name: 'Radish', group: 'Vegetable', emoji: '🔴',
      perSq: 16, spanC: 1, spanR: 1,
      sun: 'Can get by with less than a few hours (UMN raised beds).',
      days: '30',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 20–30.',
      gridNote: '16 per square at 3 in. SDSU P-00379 and UF/IFAS. CSU lists 2–3 in.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Direct sow.'
    },
    {
      id: 'scallion', name: 'Green onion', group: 'Vegetable', emoji: '🧅',
      perSq: 16, spanC: 1, spanR: 1,
      sun: 'Scallions are on UMN’s list of crops that can grow with less than a few hours of sun.',
      days: '60',
      daysNote: 'Typical days to harvest for green onions. CSU GardenNotes #720. UF/IFAS bunching onions are 30–75.',
      gridNote: '16 per square. SDSU lists green onions at 3 in. UF/IFAS bunching onions are 16. CSU lists 2–3 in.',
      direct: [-28, -14], directNote: 'CSU groups onions with hardy crops: as early as 2–4 weeks before the last spring frost.',
      method: 'Direct sow sets or seed.'
    },
    {
      id: 'beet', name: 'Beet', group: 'Vegetable', emoji: '🟣',
      perSq: 16, spanC: 1, spanR: 1,
      sun: 'Beet greens are on UMN’s list of crops that can grow with less than a few hours of sun.',
      days: '60',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. SDSU’s sample table lists 50–65.',
      gridNote: 'This grid uses SDSU’s square-foot count: 16 at 3 in. CSU’s block spacing is wider, 4–6 in (about 4 per square at 6 in), and only the closer figure is suggested for rich soil.',
      direct: [-14, 0], directNote: 'Semi-hardy: as early as 0–2 weeks before the average last spring frost (CSU).',
      method: 'Direct sow. Beets do not like transplanting (UMN).'
    },
    {
      id: 'bean', name: 'Bush bean', group: 'Vegetable', emoji: '🫘',
      perSq: 9, spanC: 1, spanR: 1,
      sun: 'Full sun. UMN’s raised-bed page uses 6–8 hours for fruiting crops such as tomatoes; beans are a summer crop in the same guides.',
      days: '60',
      daysNote: 'Typical days to harvest for snap beans. CSU GardenNotes #720. SDSU lists 50–90. UF/IFAS lists 55–70.',
      gridNote: '9 per square at 4 in (SDSU and UF/IFAS bush beans). CSU’s wider block figure is 6 in, about 4 per square.',
      direct: [0, 0], directNote: 'Tender: sow around the average last spring frost (CSU).',
      method: 'Direct sow.'
    },
    {
      id: 'spinach', name: 'Spinach', group: 'Vegetable', emoji: '🍃',
      perSq: 9, spanC: 1, spanR: 1,
      sun: 'Cool-season green. UMN does not list spinach with the low-light crops; give it a bright bed.',
      days: '40',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720.',
      gridNote: '9 per square at 4 in (SDSU). CSU’s wider block figure is 4–6 in.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Direct sow.'
    },
    {
      id: 'garlic', name: 'Garlic', group: 'Vegetable', emoji: '🧄',
      perSq: 9, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed for this list. A hours figure for garlic is not in the sources used here.',
      days: '180–210',
      daysNote: 'Days to harvest from the UF/IFAS Leon County square-foot guide. That guide is for Northwest Florida.',
      gridNote: '9 per square at 4 in (SDSU). UF/IFAS lists 4 per square. This grid follows SDSU because that sheet is the square-foot count we use when it names the crop.',
      timingNote: 'UF/IFAS plants garlic in October–November in Northwest Florida. That month range is not your frost date. Check a local extension note before you plant.',
      method: 'Plant cloves, not seed (UF/IFAS).'
    },
    {
      id: 'lettuce', name: 'Leaf lettuce', group: 'Vegetable', emoji: '🥬',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'UMN lists lettuce among crops that can grow with less than a few hours of sun.',
      days: '60',
      daysNote: 'Typical days to harvest for leaf types. CSU GardenNotes #720. UF/IFAS lists 50–90 for lettuce.',
      gridNote: '4 per square at 6 in (SDSU and UF/IFAS leaf lettuce). CSU’s block spacing for leaf lettuce is 7–9 in, which is wider.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Direct sow. You can also transplant lettuce; CSU’s leaf-lettuce row does not list a transplant age.'
    },
    {
      id: 'chard', name: 'Swiss chard', group: 'Vegetable', emoji: '🌿',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Bright bed. UMN’s low-light list names beet greens, not chard.',
      days: '60',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720.',
      gridNote: '4 per square at 6 in (SDSU). CSU’s block spacing is 7–9 in.',
      direct: [-14, 0], directNote: 'Semi-hardy: as early as 0–2 weeks before the average last spring frost (CSU).',
      method: 'Direct sow.'
    },
    {
      id: 'basil', name: 'Basil', group: 'Herb', emoji: '🌱',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Most herbs need at least 6 hours of direct sun (UMN).',
      days: '60–90',
      daysNote: 'UF/IFAS Leon County square-foot guide. SDSU’s layout table does not give basil a day count.',
      gridNote: '4 per square at 6 in (SDSU). UF/IFAS lists 1 per square. This grid follows SDSU.',
      transplant: [1, 1], transplantNote: 'UMN groups basil with warm-season crops set out after the last frost, and says to transplant herbs after frost danger has passed. The date shown is the day after your frost date.',
      method: 'Transplant, or direct sow (UF/IFAS lists both). Indoor weeks are not in the sources used here, so no indoor date is shown.'
    },
    {
      id: 'broccoli', name: 'Broccoli', group: 'Vegetable', emoji: '🥦',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure for broccoli is not in the sources used here.',
      days: '65 from transplant',
      daysNote: 'CSU GardenNotes #720. Days are from transplant, not from seed. UF/IFAS lists 75–90. SDSU’s sample table lists  cabbage separately; broccoli days are not in that table.',
      gridNote: '1 per square (SDSU, 12 in). UF/IFAS says 1 per 2 square feet. CSU’s block spacing is 18 in. This grid follows SDSU. Give it more room if plants crowd.',
      indoor: [-77, -49], indoorNote: 'CSU: transplants are 5–7 weeks old, and hardy crops can go out as early as 2–4 weeks before the last frost. The date span is that wide on purpose.',
      transplant: [-28, -14], transplantNote: 'As early as 2–4 weeks before the average last spring frost (CSU hardy crops).',
      method: 'Usually transplanted in spring (CSU).'
    },
    {
      id: 'cabbage', name: 'Cabbage', group: 'Vegetable', emoji: '🟢',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '85 from transplant',
      daysNote: 'CSU GardenNotes #720, from transplant. SDSU’s sample table lists 60–90.',
      gridNote: '1 per square (SDSU, 12 in). CSU’s block spacing is 18 in, which needs more than one square. This grid follows SDSU.',
      indoor: [-77, -49], indoorNote: 'Same CSU windows as broccoli: 5–7 week transplants, set out as early as 2–4 weeks before the last frost.',
      transplant: [-28, -14], transplantNote: 'As early as 2–4 weeks before the average last spring frost (CSU hardy crops).',
      method: 'Usually transplanted in spring (CSU).'
    },
    {
      id: 'pepper', name: 'Pepper', group: 'Vegetable', emoji: '🌶️',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun, at least 6–8 hours (UMN raised beds, for peppers).',
      days: '70 from transplant',
      daysNote: 'CSU GardenNotes #720, from transplant. UF/IFAS lists 80–100. SDSU lists 60–100.',
      gridNote: '1 per square (SDSU and UF/IFAS). CSU’s block spacing is 15–18 in, a bit wider than one foot.',
      indoor: [-42, -28], indoorNote: 'CSU: start transplants 6–8 weeks before set-out. Earliest set-out used here is 2 weeks after the last frost.',
      transplant: [14, 14], transplantNote: 'Earliest set-out. Very tender crops typically wait 2 or more weeks after the average last spring frost (CSU).',
      method: 'Transplant. CSU says the tomato family is usually started indoors.'
    },
    {
      id: 'eggplant', name: 'Eggplant', group: 'Vegetable', emoji: '🍆',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun, at least 6–8 hours (UMN raised beds, for eggplants).',
      days: '60 from transplant',
      daysNote: 'CSU GardenNotes #720, from transplant. UF/IFAS lists 90–110, which may be counted differently. Both figures are shown so you can see the gap.',
      gridNote: '1 per square (SDSU and UF/IFAS). CSU’s block spacing is 18–24 in. This grid follows the square-foot sheets. Use more squares if you follow CSU.',
      indoor: [-49, -28], indoorNote: 'CSU: transplants are 6–9 weeks old. Earliest set-out used here is 2 weeks after the last frost.',
      transplant: [14, 14], transplantNote: 'Earliest set-out, 2 or more weeks after the average last spring frost (CSU very tender crops).',
      method: 'Transplant.'
    },
    {
      id: 'tomato', name: 'Tomato', group: 'Vegetable', emoji: '🍅',
      perSq: 1, spanC: 2, spanR: 1,
      sun: 'Full sun. UMN says tomatoes need a long, frost-free season and full sun. The raised-bed page says 6–8 hours for tomatoes.',
      days: '65 from transplant',
      daysNote: 'CSU GardenNotes #720, from transplant. UF/IFAS lists 90–110. SDSU’s sample table lists 55–90.',
      gridNote: '1 plant on 2 squares, the UF/IFAS figure for a staked or caged tomato. CSU lists 24 in for a trellised tomato, which is about 4 square feet. SDSU does not put tomato in its 1-per-square line.',
      indoor: [-35, -21], indoorNote: 'CSU: transplants are 5–7 weeks old. Earliest set-out used here is 2 weeks after the last frost, so start about 3–5 weeks before that frost date.',
      transplant: [14, 14], transplantNote: 'Earliest set-out. CSU: very tender crops typically wait 2 or more weeks after the last frost. UMN: after frost danger has passed and the soil has warmed.',
      method: 'Transplant. Stake or cage at planting (UMN).'
    },
    {
      id: 'cucumber', name: 'Cucumber', group: 'Vegetable', emoji: '🥒',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed for this summer crop.',
      days: '55',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 50–65. SDSU lists 50–70.',
      gridNote: '1 per square (UF/IFAS). CSU says 6 in if trellised (about 4 per square) and 24–36 in if not. This grid uses the roomier UF count. Trellis it if you only give it one square.',
      direct: [0, 0], directNote: 'Tender: sow around the average last spring frost (CSU).',
      timingNote: 'If you transplant, wait until frost risk has passed. CSU says vine-crop seedlings should be only 2–3 weeks old, and that direct sowing does better.',
      method: 'Direct sow preferred (CSU).'
    },
    {
      id: 'squash', name: 'Summer squash', group: 'Vegetable', emoji: '🟡',
      perSq: 1, spanC: 2, spanR: 2,
      sun: 'Full sun is the usual bed for this summer crop.',
      days: '50',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 40–55. SDSU lists 50–70.',
      gridNote: '1 plant on 4 squares (UF/IFAS, and the 24 in non-vining example in that guide). CSU’s block spacing is wider: 36–48 in.',
      direct: [0, 0], directNote: 'Tender: sow around the average last spring frost (CSU).',
      timingNote: 'Transplants, if you use them, wait until frost risk has passed and should be only 2–3 weeks old (CSU).',
      method: 'Direct sow preferred (CSU).'
    },
    {
      id: 'pea', name: 'Pea', group: 'Vegetable', emoji: '🟢',
      perSq: 8, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '65',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS English peas are 50–70. SDSU lists 50–80.',
      gridNote: '8 per square along a trellis (UF/IFAS English peas). CSU’s block spacing is 4–6 in, about 4 per square at 6 in. SDSU says a trellis can go at the end of a bed for vining crops.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Direct sow. Give them a trellis.'
    },
    {
      id: 'kale', name: 'Kale', group: 'Vegetable', emoji: '🥬',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'UMN lists baby kale among crops that can grow with less than a few hours of sun.',
      days: '50–55',
      daysNote: 'SDSU sample layout table. UF/IFAS lists 70–80 for Northwest Florida. Both are real published ranges.',
      gridNote: '1 per square (UF/IFAS). SDSU’s count list does not name kale.',
      direct: [-28, -28], directNote: 'CSU’s mountain-county guide: direct-seed frost-tolerant plants, including kale, four weeks before the last frost.',
      timingNote: 'SDSU also lists transplanting kale, but that sheet does not give a week count.',
      method: 'Direct sow or transplant (SDSU, UF/IFAS).'
    },
    {
      id: 'potato', name: 'Potato', group: 'Vegetable', emoji: '🥔',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '125',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 85–110.',
      gridNote: '1 per square. UF/IFAS says 1. CSU’s block spacing is 12–15 in.',
      direct: [-14, 0], directNote: 'Semi-hardy: as early as 0–2 weeks before the average last spring frost (CSU).',
      method: 'Plant seed pieces that each have an eye (UF/IFAS).'
    },
    {
      id: 'onion', name: 'Bulbing onion', group: 'Vegetable', emoji: '🧅',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '110',
      daysNote: 'Typical days to harvest for dry onions from seed or sets. CSU GardenNotes #720. UF/IFAS lists 90–150.',
      gridNote: '4 per square. UF/IFAS says 4. CSU’s wider block figure is 6 in, which is also 4 per square. SDSU’s 9-per-square line is green onions and garlic, not bulbing onions.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Seed, sets, or transplants. UF/IFAS notes that short-day varieties suit Northwest Florida; match the type to your day length.'
    },
    {
      id: 'leek', name: 'Leek', group: 'Vegetable', emoji: '🧅',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '120',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720.',
      gridNote: '4 per square, from CSU’s wider block spacing of 6 in (the listed range is 4–6 in). Closer spacing is only for improved soil.',
      indoor: [-56, -42], indoorNote: 'CSU mountain-county guide: sow leeks indoors 6–8 weeks before the last frost.',
      transplant: [-14, -14], transplantNote: 'That same guide says to plant them out two weeks before the last frost.',
      method: 'Transplant. GardenNotes #720 does not list a transplant age; the weeks come from the mountain guide.'
    },
    {
      id: 'turnip', name: 'Turnip', group: 'Vegetable', emoji: '⚪',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '50',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 40–60.',
      gridNote: '4 per square, from CSU’s wider 6 in spacing (range 4–6 in). UF/IFAS lists 9 per square. This grid uses the wider CSU figure.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Direct sow.'
    },
    {
      id: 'kohlrabi', name: 'Kohlrabi', group: 'Vegetable', emoji: '🟢',
      perSq: 1, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '50',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 70–80.',
      gridNote: '1 per square. CSU’s block spacing is 7–9 in, so four plants would be tighter than that sheet. UF/IFAS lists 4 per square. This grid stays with the wider CSU figure.',
      direct: [-28, -14], directNote: 'Hardy: as early as 2–4 weeks before the average last spring frost (CSU).',
      method: 'Direct sow. CSU does not list a transplant age for kohlrabi.'
    },
    {
      id: 'mustard', name: 'Mustard', group: 'Vegetable', emoji: '🥬',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '40–60',
      daysNote: 'UF/IFAS Leon County square-foot guide.',
      gridNote: '4 per square (UF/IFAS).',
      direct: [-28, -28], directNote: 'CSU’s mountain-county guide lists mustard with crops direct-seeded four weeks before the last frost.',
      method: 'Direct sow or transplant (UF/IFAS). Week counts for transplants are not in that Florida guide.'
    },
    {
      id: 'parsnip', name: 'Parsnip', group: 'Vegetable', emoji: '🟡',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'Full sun is the usual bed. A separate hours figure is not in the sources used here.',
      days: '70',
      daysNote: 'Typical days to harvest in CSU GardenNotes #720. Many seed packets list a longer time. This tool shows the extension figure.',
      gridNote: '4 per square, from CSU’s wider 6 in spacing (range 5–6 in).',
      direct: [-14, 0], directNote: 'Semi-hardy: as early as 0–2 weeks before the average last spring frost (CSU).',
      method: 'Direct sow.'
    },
    {
      id: 'wintersquash', name: 'Winter squash', group: 'Vegetable', emoji: '🟠',
      perSq: 1, spanC: 2, spanR: 1,
      sun: 'Full sun is the usual bed for this summer vine.',
      days: '100',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS lists 80–110.',
      gridNote: '1 plant on 2 squares if you trellis it (UF/IFAS). On the ground, CSU says 36–48 in. The grid assumes a trellis.',
      direct: [14, 14], directNote: 'Very tender. CSU says these crops typically wait 2 or more weeks after the last frost, and that direct sowing does better than transplanting.',
      indoor: [-7, 0], indoorNote: 'Only if you transplant. CSU: seedlings should be 2–3 weeks old, set out 2 or more weeks after the last frost.',
      transplant: [14, 14], transplantNote: 'Earliest set-out if you use a transplant (CSU).',
      method: 'Direct sow preferred, on a trellis in this grid (CSU, UF/IFAS).'
    },
    {
      id: 'cantaloupe', name: 'Cantaloupe', group: 'Vegetable', emoji: '🍈',
      perSq: 1, spanC: 2, spanR: 1,
      sun: 'Full sun is the usual bed for this summer vine.',
      days: '85',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720. UF/IFAS groups melons at 75–95.',
      gridNote: '1 plant on 2 squares if trellised (UF/IFAS melons). On the ground, CSU says 36–48 in. The grid assumes a trellis.',
      direct: [14, 14], directNote: 'Very tender: typically 2 or more weeks after the last frost (CSU). Direct sowing is preferred.',
      indoor: [-7, 0], indoorNote: 'Only if you transplant. Seedlings 2–3 weeks old (CSU).',
      transplant: [14, 14], transplantNote: 'Earliest set-out if you use a transplant (CSU).',
      method: 'Direct sow preferred, trellised in this grid.'
    },
    {
      id: 'watermelon', name: 'Watermelon', group: 'Vegetable', emoji: '🍉',
      perSq: 1, spanC: 2, spanR: 1,
      sun: 'Full sun is the usual bed for this summer vine.',
      days: '85',
      daysNote: 'Typical days to harvest. CSU GardenNotes #720.',
      gridNote: '1 plant on 2 squares if trellised. UF/IFAS uses watermelon as the example of 24 in vining spacing, which is 1 per 2 squares with a trellis. On the ground, CSU says 36–48 in.',
      direct: [14, 14], directNote: 'Very tender: typically 2 or more weeks after the last frost (CSU). Direct sowing is preferred.',
      indoor: [-7, 0], indoorNote: 'Only if you transplant. Seedlings 2–3 weeks old (CSU).',
      transplant: [14, 14], transplantNote: 'Earliest set-out if you use a transplant (CSU).',
      method: 'Direct sow preferred, trellised in this grid.'
    },
    {
      id: 'marigold', name: 'Marigold', group: 'Flower', emoji: '🌼',
      perSq: 4, spanC: 1, spanR: 1,
      sun: 'A flower bed in sun. A hours figure is not in the sources used here.',
      days: '2 months as a cover',
      daysNote: 'Not a vegetable harvest. UF/IFAS ENY-056: for nematode suppression, grow marigolds at least two months on the spot where the next crop will go.',
      gridNote: '4 per square is 6 in apart. Clemson says a nematode planting must be solid, no more than 7 in apart. This is inside that spacing, not a bloom-spacing claim.',
      direct: [-14, -14], directNote: 'CSU’s annuals table marks marigold as a flower best direct seeded about two weeks before the average frost-free date.',
      indoor: [-28, -28], indoorNote: 'The same CSU table lists 4 weeks indoors.',
      method: 'Direct sow or start indoors (CSU). For nematodes, a solid block matters more than a flower dotted in the bed (Clemson, LSU).'
    }
  ];

  const byId = {};
  plants.forEach(function (p) { byId[p.id] = p; });

  return { list: plants, byId: byId };
});
