import { merge } from "lodash";
import ChartEvent from "./event";
import ChartMode from "./mode";
import { DOCS_FULL_URL } from "./utils.js";
import { DateTime, Interval } from "luxon";
import format from "string-template";

/**
 * @external DateTime
 * @see {@link https://moment.github.io/luxon/api-docs/index.html#datetime|DateTime}
 */

/**
 * @type {Chart}
 * @hideconstructor
 */
class Chart
{
  /**
   * Main entrypoint to use the library. Provided {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Element} will be the container of the Gantt Chart. Recommended to use a {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div|div} element with sufficient width and height
   * @param {Element} container {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Element}
   * @param {ChartOptions|undefined} options
   * @param {external:DateTime|String|Number|undefined} start
   * @param {external:DateTime|String|Number|undefined} end
   * @returns {Chart}
   */
  static get(container, options, start, end)
  {
    if(!container instanceof Element)
    {
      throw new Error(`Expected argument of type Element, got ${typeof container}`);
    }

    let instance = this.findInstance(container);

    if(!(instance instanceof Chart) || options !== undefined)
    {
      if(typeof options !== `object` || options === null)
      {
        options = {};
      }

      options = merge(this.defaultOptions, options);
    }

    if(!(instance instanceof Chart))
    {
      if(start === undefined || end === undefined)
      {
        throw new Error(`Can't pass 'start' or 'end' as undefined, when creating a new instance`);
      }

      instance = new this(false);

      instance.container = container;
      instance.options = options;
      instance.processOptions();

      container.UGLAGanttInstance = instance;
      instance.setAttribute(`container`, ``);

      instance.updateContainerStyle();
      instance.setPeriod(start, end);
    }
    else if(options !== undefined)
    {
      instance.options = options;
      instance.processOptions();

      if(start !== undefined || end !== undefined)
      {
        instance.setPeriod(start, end);
      }
      else
      {
        instance.render();
      }
    }

    return instance;
  }

  /**
   * @param {Element} container {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Element}
   * @private
   * @returns {Chart|undefined}
   */
  static findInstance(container)
  {
    return container.UGLAGanttInstance;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Element}
   * @type {Element}
   * @readonly
   */
  container;

  /**
   * @type {ChartOptions}
   * @readonly
   */
  options;

  /**
   * @type {external:DateTime}
   */
  start;

  /**
   * @type {external:DateTime}
   */
  end;

  constructor(warn = true)
  {
    if(warn)
    {
      console.warn(`You should not use the constructor directly, unless you know what you are doing. It's better to use ${this.constructor.name}.get() instead.`)
    }
  }

  /**
   * @typedef {Object} ChartOptions
   * @property {String|ChartMode} [mode=`days`]
   * @property {String} [locale=`en-gb`]
   * @property {String} [timezone=`UTC`]
   * @property {String} [attributePrefix=`data-ugla-gantt`]
   * @property {Object} customization
   * @property {Object} customization.columns
   * @property {Number} [customization.columns.minWidthEm=3]
   * @property {CSSStyleDeclaration} [customization.columns.containerStyle={}]
   * @property {Object} customization.columns.header
   * @property {String} [customization.columns.header.template=`{formatted}`]
   * @property {CSSStyleDeclaration} [customization.columns.header.style={}]
   * @property {Object} customization.connectingLines Configuration relating to the lines that are drawn onto the canvas, connecting {@link Bar} instances
   * @property {Number} [customization.connectingLines.thickness=2]
   * @property {String} [customization.connectingLines.color=`#000000`]
   */

  /**
   * @type {ChartOptions}
   * @const
   */
  static defaultOptions = {
    attributePrefix: `data-gantt`,
    mode: `days`,
    locale: `en-gb`,
    timezone: `local`,
    customization: {
      columns: {
        minWidthEm: 3,
        containerStyle: {
          display: `flex`,
          alignItems: `center`,
        },
        header: {
          template: `{formatted}`,
          style: {
            display: `flex`,
            alignItems: `center`,
            justifyContent: `center`,
          },
        },
      },
      connectingLines: {
        thickness: 2,
        color: `#000000`,
      },
    },
  };

  /**
   * @private
   */
  attributeName(name)
  {
    return `${this.options.attributePrefix}-${name}`;
  }

  /**
   * @private
   */
  setAttribute(name, value, el = this.container)
  {
    el.setAttribute(this.attributeName(name), value);
  }

  /**
   * @private
   */
  getAttribute(name, defaultValue = undefined, el = this.container)
  {
    return el.getAttribute(this.attributeName(name)) ?? defaultValue;
  }

  /**
   * @private
   */
  updateContainerStyle()
  {
    Object.assign(this.container.style, {
      display: `flex`,
      flexDirection: `column`,
      width: `100%`,
      overflowX: `auto`,
      overflowY: `hidden`,
    });
  }

  /**
   * @private
   */
  processOptions()
  {
    /**
     * Unpacking ChartMode preset by string key
     */
    if(typeof this.options.mode === `string`)
    {
      if(ChartMode.DEFAULTS[this.options.mode] !== undefined)
      {
        this.options.mode = ChartMode.DEFAULTS[this.options.mode];
      }
      else
      {
        throw new Error(`Undefined mode preset '${this.options.mode}'. If you want to use a custom interval and/or format, pass an instance of ChartMode. See ${DOCS_FULL_URL}/ChartMode.html`);
      }
    }
  }

  /**
   * 
   * @param {external:DateTime|String|Number|undefined} start
   * @param {external:DateTime|String|Number|undefined} end
   * @returns {Promise<Chart>}
   */
  setPeriod(start, end)
  {
    if(start !== undefined)
    {
      this.start = this.castToDateTime(start);
    }

    if(end !== undefined)
    {
      this.end = this.castToDateTime(end);
    }

    return this.render();
  }

  /**
   * @private
   * @param {DateTime} dt
   * @returns {DateTime}
   */
  castToDateTime(dt)
  {
    if(typeof dt === `number`)
    {
      return DateTime.fromSeconds(dt, { zone: this.options.timezone, locale: this.options.locale });
    }
    else if(typeof dt === `string`)
    {
      let fromFormat = DateTime.fromFormat(dt, `yyyy-MM-dd HH:mm:ss`, { zone: this.options.timezone, locale: this.options.locale });

      return fromFormat.isValid ? fromFormat : DateTime.fromFormat(dt, `yyyy-MM-dd`, { zone: this.options.timezone, locale: this.options.locale });
    }
    else
    {
      return dt;
    }
  }

  /**
   * <p>Called automatically, when initializing a container for the first time through {@link Chart.get}</p>
   * <p>Will trigger {@link ChartEvent#RENDERED} immediately <b>AFTER</b> resolving</p>
   * 
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise|Promise}
   * @returns {Promise<Chart>}
   */
  render()
  {
    return new Promise(async (resolve, reject) => {
      try
      {
        const { chartHeader } = await this.renderCanvas();

        this.container.replaceChildren(chartHeader);

        resolve(this);
        this.trigger(new ChartEvent(ChartEvent.RENDERED, { instance: this }));
      }
      catch(err)
      {
        console.error(err);
        reject(err);
      }
    });
  }

  /**
   * @private
   * @returns {Promise<Element>}
   */
  renderCanvas()
  {
    return new Promise(resolve => {
      const interval = Interval.fromDateTimes(this.start, this.end);
      const promises = interval.splitBy(this.options.mode.interval).map(dt => this.renderColumn(dt.start));

      Promise.all(promises).then(columns => {
        const chartHeader = document.createElement(`div`);

        if(columns.length)
        {
          Object.assign(chartHeader.style, this.options.customization.columns.containerStyle);

          const fontSize = parseFloat(window.getComputedStyle(columns[0]).getPropertyValue(`font-size`));
          let columnWidth = 0;

          columns.forEach(column => {
            columnWidth = Math.max(columnWidth, column.clientWidth);
          });

          columnWidth = `${Math.min(3, columnWidth / fontSize)}em`;

          columns.forEach(column => {
            Object.assign(column.style, { width: columnWidth });
          });

          chartHeader.append(...columns);

          Object.assign(chartHeader.style, {
            overflow: `hidden`,
            width: `min-content`,
          });
        }

        resolve({ chartHeader });
      });
    });
  }

  /**
   * @private
   * @param {DateTime} dt
   * @returns {Promise<Element>}
   */
  renderColumn(dt)
  {
    return new Promise(resolve => {
      const headerContainer = document.createElement(`div`);
      Object.assign(headerContainer.style, this.options.customization.columns.header.style);
      headerContainer.innerHTML = format(this.options.customization.columns.header.template, { formatted: dt.toFormat(this.options.mode.format) });

      resolve(headerContainer);
    });
  }

  /**
   * @param {ChartEvent} event
   * @private
   */
  trigger(event)
  {
    this.container.dispatchEvent(event);
  }
}

export { Chart, ChartEvent };
