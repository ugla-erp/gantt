import { Chart, ChartEvent } from "./src";

const container = document.getElementById(`container`);

container.addEventListener(ChartEvent.BARMOVE, e => {
  if(e.detail.to.startIDX < 4)
  {
    e.detail.revert();
  }
});

Chart.get(container, { mode: `index`, customization: {
  chart: {
    bar: {
      heightCoef: 0.6,
      class: `example_bar_class`,
      style: {
        background: `rgba(28,90,172,1)`
      }
    }
  },
  connectingLines: {
    // color: `red`
  },
}
}, 2, 10, [
{
  id: 3123,
  startIDX: 2,
  endIDX: 4,
  connectedTo: [3125, 3124],
},
{
  id: 3127,
  startIDX: 3,
  endIDX: 3,
  connectedTo: [3125, 3124],
},
{
  id: 3125,
  startIDX: 4,
  endIDX: 5,
},
{
  id: 3126,
  startIDX: 3,
  endIDX: 5,
},
{
  id: 3124,
  startIDX: 5,
  endIDX: 5,
  connectedTo: [3126]
},
]);

// Chart.get(container, { mode: `days`, customization: {
//     chart: {
//       bar: {
//         heightCoef: 0.6,
//         class: `example_bar_class`,
//         style: {
//           background: `rgba(28,90,172,1)`
//         }
//       }
//     },
//     connectingLines: {
//       // color: `red`
//     },
//   }
// }, `2024-03-01`, `2024-03-31`, [
//   {
//     id: 3123,
//     start: `2024-03-06`,
//     end: `2024-03-07`,
//     connectedTo: [3125, 3124],
//   },
//   {
//     id: 3127,
//     start: `2024-03-06`,
//     end: `2024-03-06`,
//     connectedTo: [3125, 3124],
//   },
//   {
//     id: 3125,
//     start: `2024-03-07`,
//     end: `2024-03-08`,
//   },
//   {
//     id: 3126,
//     start: `2024-03-09`,
//     end: `2024-03-10`,
//   },
//   {
//     id: 3124,
//     start: `2024-03-06`,
//     end: `2024-03-09`,
//     connectedTo: [3126]
//   },
// ]);
