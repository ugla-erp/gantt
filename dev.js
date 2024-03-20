import { Chart, ChartEvent } from "./src";

const container = document.getElementById(`container`);

container.addEventListener(ChartEvent.BARCLICK, console.log);

Chart.get(container, { mode: `days`, customization: {
    chart: {
      bar: {
        heightCoef: 0.6,
        class: `example_bar_class`,
        style: {
          background: `rgba(28,90,172,1)`
        }
      }
    }
  }
}, `2024-03-01`, `2024-03-31`, [
  {
    id: 3123,
    start: `2024-03-06`,
    end: `2024-03-07`,
  },
  {
    id: 3124,
    start: `2024-03-06`,
    end: `2024-03-06`,
  },
  {
    id: 3125,
    start: `2024-03-07`,
    end: `2024-03-08`,
  },
  {
    id: 3126,
    start: `2024-03-08`,
    end: `2024-03-09`,
  },
  {
    id: 3124,
    start: `2024-03-06`,
    end: `2024-03-09`,
    connectedTo: [3125, 3126],
  },
]);
