/**
 * @type {ChartMode}
 * @hideconstructor
 */
class ChartMode
{
  /**
   * @type {Object}
   * @see {@link https://moment.github.io/luxon/api-docs/index.html#durationfromobject}
   */
  interval;

  /**
   * @type {String}
   * @see {@link https://moment.github.io/luxon/#/formatting?id=table-of-tokens|Table of tokens}
   */
  format;

  /**
   * Available keys:
   * 
   * <p><code>minutes_5</code> | <code>minutes_10</code> | <code>minutes_15</code> | <code>minutes_30</code> | <code>hours</code> | <code>hours_3</code> | <code>hours_6</code> | <code>hours_12</code> | <code>days</code> | <code>daysOfTheWeek</code> | <code>weeks</code> | <code>weeks_2</code> | <code>months</code> | <code>months_6</code> | <code>quarters</code> | <code>years</code> | <code>years_3</code> | <code>years_5</code> | <code>years_10</code> | <code>years_25</code> | <code>years_50</code> | <code>years_100</code></p>
   * @type {Object}
   * @const
   */
  static DEFAULTS = {
    minutes_5: {
      interval: { minutes: 5 },
      format: `T`,
    },
    minutes_10: {
      interval: { minutes: 10 },
      format: `T`,
    },
    minutes_15: {
      interval: { minutes: 15 },
      format: `T`,
    },
    minutes_30: {
      interval: { minutes: 30 },
      format: `T`,
    },
    hours: {
      interval: { hours: 1 },
      format: `HH`,
    },
    hours_3: {
      interval: { hours: 3 },
      format: `HH`,
    },
    hours_6: {
      interval: { hours: 6 },
      format: `HH`,
    },
    hours_12: {
      interval: { hours: 12 },
      format: `HH`,
    },
    days: {
      interval: { days: 1 },
      format: `dd/MM`,
    },
    daysOfTheWeek: {
      interval: { days: 1 },
      format: `EEEE`,
    },
    weeks: {
      interval: { weeks: 1 },
      format: `WW/kkkk`,
    },
    weeks_2: {
      interval: { weeks: 2 },
      format: `WW/kkkk`,
    },
    months: {
      interval: { months: 1 },
      format: `MMMM`,
    },
    months_6: {
      interval: { months: 6 },
      format: `MMMM`,
    },
    quarters: {
      interval: { quarters: 1 },
      format: `q`,
    },
    years: {
      interval: { years: 1 },
      format: `yyyy`,
    },
    years_3: {
      interval: { years: 3 },
      format: `yyyy`,
    },
    years_5: {
      interval: { years: 5 },
      format: `yyyy`,
    },
    years_10: {
      interval: { years: 10 },
      format: `yyyy`,
    },
    years_25: {
      interval: { years: 25 },
      format: `yyyy`,
    },
    years_50: {
      interval: { years: 50 },
      format: `yyyy`,
    },
    years_100: {
      interval: { years: 100 },
      format: `yyyy`,
    },
  };
}

export default ChartMode;
