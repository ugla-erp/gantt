import { Chart } from "./src";

const container = document.getElementById(`container`);

Chart.get(container, { mode: `days` }, `2024-03-01`, `2024-03-31`, [{
  id: 3123,
  start: `2024-03-30 16:55:00`,
  end: `2024-03-30 18:20:00`,
}]);
