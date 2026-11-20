/* Bloom, cut-flower, task, and companion lines.
   A month is listed only when the cited page names that month or a span of months.
   Seasons stay seasons when that is all the page says. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YardFacts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var blooms = [
    {
      name: 'Daylily',
      region: 'Minnesota',
      months: [7],
      phrase: 'Peak bloom in Minnesota is July to early August. The bar is July only. The page does not name an August day.',
      source: 'University of Minnesota Extension. “Daylilies.”',
      href: 'https://extension.umn.edu/gardening-minnesota/daylilies'
    },
    {
      name: 'Daylily',
      region: 'South Carolina',
      months: [],
      phrase: 'In bloom from late spring until autumn. Midseason is May on the coast and June in the mountains. One clump may bloom 30 to 40 days. No single month bar is drawn.',
      source: 'Clemson Cooperative Extension HGIC. “Daylily.”',
      href: 'https://hgic.clemson.edu/factsheet/daylily/'
    },
    {
      name: 'Peony',
      region: 'South Carolina',
      months: [3, 4, 5],
      phrase: 'Mid- to late spring. Depending on the cultivar and the weather, as early as March or as late as May. Often poor in the lower South because winter chilling is required. The page does not give a zone number for that limit.',
      source: 'Clemson Cooperative Extension HGIC 1170. “Peonies.”',
      href: 'https://hgic.clemson.edu/factsheet/peonies/'
    },
    {
      name: 'Dahlia',
      region: 'South Carolina',
      months: [],
      phrase: 'Normally blooms from midsummer until frost. “Until frost” is not turned into months, because frost day changes by place.',
      source: 'Clemson Cooperative Extension HGIC. “Summer- and Fall-Flowering Bulbs.”',
      href: 'https://hgic.clemson.edu/factsheet/summer-and-fall-flowering-bulbs/'
    },
    {
      name: 'Dahlia',
      region: 'Penn State page, not a state limit',
      months: [],
      phrase: 'Blooms in late summer and early fall. Planted in spring after frost danger, and dug in fall where it is not winter hardy.',
      source: 'Penn State Extension. “Summer and Fall Blooming Bulbs.” Updated February 18, 2026.',
      href: 'https://extension.psu.edu/summer-and-fall-blooming-bulbs/'
    },
    {
      name: 'Garden mum',
      region: 'South Carolina',
      months: [],
      zoneMin: '5a',
      zoneMax: '9b',
      phrase: 'Bloom season is fall until freezing temperatures. Clemson says garden mums are hardy across South Carolina and lists USDA zones 5a to 9b for that hardiness. Fall is not split into months here.',
      source: 'Clemson Cooperative Extension HGIC 1161. “Chrysanthemums.” Updated November 13, 2025.',
      href: 'https://hgic.clemson.edu/factsheet/chrysanthemums-how-to-grow-garden-mums-in-south-carolina/'
    },
    {
      name: 'Smooth hydrangea',
      region: 'South Carolina',
      months: [6, 7, 8, 9],
      phrase: 'Dull white flowers, blooming late June through September. June on the bar includes the whole month. The page says late June.',
      source: 'Clemson Cooperative Extension HGIC 1067. “Hydrangea Care in South Carolina.” Updated October 31, 2025.',
      href: 'https://hgic.clemson.edu/factsheet/hydrangea-care-in-south-carolina/'
    },
    {
      name: 'Panicle hydrangea, Tardiva',
      region: 'South Carolina',
      months: [8, 9],
      phrase: 'Late blooming, August to September.',
      source: 'Clemson Cooperative Extension HGIC 1067. “Hydrangea Care in South Carolina.”',
      href: 'https://hgic.clemson.edu/factsheet/hydrangea-care-in-south-carolina/'
    },
    {
      name: 'Panicle hydrangea, Praecox',
      region: 'South Carolina',
      months: [6],
      phrase: 'Early blooming, June.',
      source: 'Clemson Cooperative Extension HGIC 1067. “Hydrangea Care in South Carolina.”',
      href: 'https://hgic.clemson.edu/factsheet/hydrangea-care-in-south-carolina/'
    },
    {
      name: 'Bigleaf hydrangea',
      region: 'South Carolina',
      months: [],
      phrase: 'Described as long-lasting summer color, with next summer’s blooms on old wood. Summer is not turned into month numbers.',
      source: 'Clemson Cooperative Extension HGIC 1067. “Hydrangea Care in South Carolina.”',
      href: 'https://hgic.clemson.edu/factsheet/hydrangea-care-in-south-carolina/'
    },
    {
      name: 'Tulip',
      region: 'Named as an example, not a state',
      months: [],
      phrase: 'A spring-blooming bulb, planted in the fall. The page does not name the bloom month.',
      source: 'Penn State Extension. “Summer and Fall Blooming Bulbs.”',
      href: 'https://extension.psu.edu/summer-and-fall-blooming-bulbs/'
    }
  ];

  var cuts = [
    {
      name: 'Lily (Lilium)',
      region: 'South Carolina',
      phrase: 'Called a great cut flower, with color during most of the summer. “Most of the summer” is not a month list.',
      source: 'Clemson Cooperative Extension HGIC. “Summer- and Fall-Flowering Bulbs.”',
      href: 'https://hgic.clemson.edu/factsheet/summer-and-fall-flowering-bulbs/'
    }
  ];

  var tasks = [
    ['As soon as the ground thaws', 'Direct seed spring cover crops: peas, oats, clover.'],
    ['March and April', 'Cut back perennials.'],
    ['Mid-March through early May', 'Start summer vegetable seeds indoors.'],
    ['April', 'Direct seed or transplant cool-season vegetables: brassicas, spinach, cold-tolerant lettuces.'],
    ['2nd week of April through the 3rd week of June', 'Best time to divide perennials. End of June through the end of August is also listed.'],
    ['3rd week of April through the end of November', 'Water.'],
    ['Last week of April', 'Direct seed moderately cold-tolerant crops such as carrots, beets, and potatoes.'],
    ['May through the end of June', 'Best time to mulch beds. October to the end of November is also listed.'],
    ['May through September', 'Weed control.'],
    ['Mid to late May, or the first week of June', 'Transplant or direct seed heat-loving vegetables: sweet corn, beans, tomatoes, and peppers.'],
    ['Last week of May through the 2nd week of June', 'Plant summer bulbs.'],
    ['Last week of May through the end of June', 'Direct seed summer vegetables. Best time to plant annuals. July through the end of August is also listed for annuals.'],
    ['Last week of May through August', 'Fertilize. Plant perennials.'],
    ['June through September', 'Deadhead.'],
    ['Mid-July through mid-August', 'Direct seed fall vegetables. Mid-July: carrots, beets, broccoli. Through mid-August: spinach, lettuce.'],
    ['Late July through early August', 'Divide bearded iris.'],
    ['Late August through September', 'Divide peonies.'],
    ['September', 'Direct seed fall cover crops that die over winter: peas, oats.'],
    ['September through October', 'Direct seed fall cover crops: ryegrass, rye, rapeseed, oats, winter wheat, winter rye.'],
    ['2nd week of September through mid-November', 'Plant spring bulbs.'],
    ['October', 'Direct seed overwintering cover crops: winter wheat, winter rye, hairy vetch.'],
    ['October through November', 'Clean up the vegetable garden.'],
    ['November', 'Cut back perennials.']
  ];

  return { blooms: blooms, cuts: cuts, tasks: tasks };
});
