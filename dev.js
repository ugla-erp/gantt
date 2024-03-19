import { Chart } from "./src";

const container = document.getElementById(`container`);

Chart.get(container, { mode: `days`, customization: {
    chart: {
      bar: {
        heightCoef: 0.6,
        style: {
          background: `linear-gradient(55deg, rgba(28,90,172,1) 0%, rgba(29,253,132,1) 64%, rgba(252,199,69,1) 100%)`
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
    start: `2024-03-06`,
    end: `2024-03-06`,
  },
]);
