import { Chart } from "./src";

const container = document.getElementById(`container`);

Chart.get(container, { mode: `days` }, `2024-03-01`, `2024-03-31`);
