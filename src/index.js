import { merge } from "lodash";
import ChartEvent from "./event";
import ChartMode from "./mode";
import { DOCS_FULL_URL } from "./utils.js";
import { DateTime, Interval } from "luxon";
import format from "string-template";
import ChartBar from "./bar.js";

/**
 * DateTime object from {@link https://moment.github.io/luxon|luxon}
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
   * @param {external:DateTime|String|Number|undefined} start If a String or a Number, will be treated as UTC, and then converted to {@link ChartOptions#timezone}. If {@link external:DateTime|DateTime}, will only convert to {@link ChartOptions#timezone}
   * @param {external:DateTime|String|Number|undefined} end If a String or a Number, will be treated as UTC, and then converted to {@link ChartOptions#timezone}. If {@link external:DateTime|DateTime}, will only convert to {@link ChartOptions#timezone}
   * @param {ChartBar[]} [data=[]]
   * @returns {Chart}
   */
  static get(container, options, start, end, data = [])
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
      instance.setData(data, false);

      container.UGLAGanttInstance = instance;
      instance.setAttribute(`container`, ``);

      instance.updateContainerStyle();
      instance.setPeriod(start, end);
    }
    else if(options !== undefined)
    {
      instance.options = options;
      instance.processOptions();
      instance.setData(data, false);

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

  /**
   * @type {ChartBar[]}
   */
  data;

  /**
   * @readonly
   * @type {Number}
   */
  fontSize = 16.0;

  /**
   * @readonly
   * @type {Number}
   */
  columnWidth = 0.0;

  /**
   * @readonly
   * @type {Number}
   */
  rowHeight = 0.0;

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
   * @property {String} [timezone=`local`]
   * @property {String} [attributePrefix=`data-ugla-gantt`]
   * 
   * @property {Object} customization
   * 
   * @property {Object} customization.container
   * @property {CSSStyleDeclaration} [customization.container.style={}]
   * 
   * @property {Object} customization.chart
   * @property {Number} [customization.chart.minWidthEm=2]
   * 
   * @property {Object} customization.chart.header
   * @property {Object} customization.chart.header.container
   * @property {CSSStyleDeclaration} [customization.chart.header.container.style={}]
   * @property {String} [customization.chart.header.template=`{formatted}`]
   * @property {CSSStyleDeclaration} [customization.chart.header.style={}]
   * 
   * @property {Object} customization.chart.body
   * @property {Number} [customization.chart.body.rowHeightEm=3]
   * @property {Object} customization.chart.body.container
   * @property {CSSStyleDeclaration} [customization.chart.body.container.style={}]
   * @property {CSSStyleDeclaration} [customization.chart.body.style={}]
   * @property {CSSStyleDeclaration} [customization.chart.body.lastStyle={}]
   * @property {CSSStyleDeclaration} [customization.chart.body.firstStyle={}]
   * 
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
      container: {
        style: {
          padding: `1em`,
          background: `#FFFFFF`,
          borderRadius: `1em`,
          fontFamily: `Lato`,
        },
      },
      chart: {
        minWidthEm: 2,
        header: {
          container: {
            style: {
              display: `flex`,
              alignItems: `center`,
            },
          },
          template: `{formatted}`,
          style: {
            display: `flex`,
            alignItems: `center`,
            justifyContent: `center`,
            padding: `0.5em 1em`,
            fontWeight: 600,
            color: `#464646`,
          },
        },
        body: {
          rowHeightEm: 3,
          container: {
            style: {
              display: `flex`,
              marginBottom: `1em`,
              overflowX: `hidden`,
              overflowY: `auto`,
              borderTopWidth: `0.15em`,
              borderTopStyle: `solid`,
              borderTopColor: `#464646`,
              borderBottomWidth: `0.15em`,
              borderBottomStyle: `solid`,
              borderBottomColor: `#464646`,
              width: `min-content`,
            },
          },
          firstStyle: {

          },
          lastStyle: {
            borderRightColor: `#464646`,
            borderRightStyle: `dashed`,
            borderRightWidth: `0.1em`,
          },
          style: {
            borderLeftColor: `#464646`,
            borderLeftStyle: `dashed`,
            borderLeftWidth: `0.1em`,
          },
        },
      },
      connectingLines: {
        thickness: 2,
        color: `#464646`,
      },
    },
  };

  /**
   * @type {Element|undefined}
   * @readonly
   */
  get chartHeader()
  {
    return this.container?.childNodes?.[0]?.childNodes?.[0];
  }

  /**
   * @type {Element|undefined}
   * @readonly
   */
  get chartBody()
  {
    return this.container?.childNodes?.[0]?.childNodes?.[1];
  }

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
    Object.assign(this.container.style, this.options.customization.container.style);
  }

  /**
   * @private
   */
  updateColumnWidth()
  {
    const chartHeader = this.chartHeader;
    const chartBody = this.chartBody;

    const columns = chartHeader.childNodes;

    if(columns?.length > 0)
    {
      const fontSize = parseFloat(window.getComputedStyle(columns[0]).fontSize);
      let columnWidth = 0;
      let trueColumnWidth = 0;

      columns.forEach(column => {
        const computedStyle = window.getComputedStyle(column);
        const width = parseFloat(computedStyle.width);
        columnWidth = Math.max(columnWidth, width - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight));
        trueColumnWidth = Math.max(trueColumnWidth, width);
      });

      trueColumnWidth = Math.max(this.options.customization.chart.minWidthEm * fontSize, trueColumnWidth);

      const trueColumnWidthEm = `${trueColumnWidth / fontSize}em`;

      const bodyColumnFontSize = parseFloat(window.getComputedStyle(chartBody.childNodes[0]).fontSize);

      this.fontSize = bodyColumnFontSize;
      this.columnWidth = trueColumnWidth;
      this.rowHeight = this.options.customization.chart.body.rowHeightEm * this.fontSize;

      columns.forEach((column, idx) => {
        Object.assign(column.style, { width: trueColumnWidthEm });
        Object.assign(chartBody.childNodes[idx].style, { minWidth: `${trueColumnWidth / bodyColumnFontSize}em` });
      });
    }
  }

  /**
   * @param {ChartOptions} options
   * @param {Boolean} [render=true]
   * @returns {Promise<Chart>}
   */
  setOptions(options, render = true)
  {
    if(options !== undefined)
    {
      if(typeof options !== `object` || options === null)
      {
        options = {};
      }

      options = merge(this.options, options);

      this.options = options;
      this.processOptions();
    }

    return render ? this.render() : Promise.resolve(this);
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
   * @param {Boolean} [render=true]
   * @returns {Promise<Chart>}
   */
  setPeriod(start, end, render = true)
  {
    if(start !== undefined)
    {
      this.start = this.castToDateTime(start);
    }

    if(end !== undefined)
    {
      this.end = this.castToDateTime(end);
    }

    return render ? this.render() : Promise.resolve(this);
  }

  /**
   * @private
   * @param {DateTime|String|Number|undefined} dt
   * @returns {DateTime}
   */
  castToDateTime(dt)
  {
    if(typeof dt === `number`)
    {
      return DateTime.fromSeconds(dt, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);
    }
    else if(typeof dt === `string`)
    {
      let fromFormat = DateTime.fromFormat(dt, `yyyy-MM-dd HH:mm:ss`, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);

      return fromFormat.isValid ? fromFormat : DateTime.fromFormat(dt, `yyyy-MM-dd`, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);
    }
    else
    {
      return dt;
    }
  }

  /**
   * If render is set to true, only ChartBars will be rendered, not the entire Chart
   * @param {ChartBar[]} data
   * @param {Boolean} [render=true]
   * @returns {Promise<Chart>}
   */
  setData(data, render = true)
  {
    /**
     * @param {ChartBar} bar
     */
    data.forEach(bar => {
      this.processBar(bar);
    });

    this.data = data;

    return !render ? Promise.resolve(Chart) : new Promise(resolve => {

    });
  }

  /**
   * @private
   * @param {ChartBar} bar 
   */
  processBar(bar)
  {
    if(bar.startIDX === undefined)
    {
      bar.start = this.castToDateTime(bar.start);
    }

    if(bar.endIDX === undefined)
    {
      bar.end = this.castToDateTime(bar.end);
    }
  }

  /**
   * <p>Called automatically, when initializing a container for the first time through {@link Chart.get}</p>
   * <p>Will trigger {@link ChartEvent#event:ChartRendered} immediately <b>AFTER</b> resolving</p>
   * 
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise|Promise}
   * @fires ChartEvent#event:ChartRendered
   * @returns {Promise<Chart>}
   */
  render()
  {
    return new Promise(async (resolve, reject) => {
      try
      {
        const { chartHeader, chartBody } = await this.renderCanvas();

        const scrollBody = document.createElement(`div`);

        Object.assign(scrollBody.style, {
          display: `flex`,
          flexDirection: `column`,
          width: `100%`,
          overflowX: `auto`,
          overflowY: `hidden`,
        });

        scrollBody.append(chartHeader, chartBody);

        this.container.replaceChildren(scrollBody);
        this.updateColumnWidth();

        resolve(this);

        /**
         * <code>{ bubbles: <b>true</b>, cancellable: <b>false</b>, composed: <b>false</b> }</code>
         * @event ChartEvent#ChartRendered
         * @type {Event}
         * @property {Object} detail
         * @property {Chart} detail.instance
         * @see {@link ChartEvent#RENDERED}
         */
        this.trigger(new ChartEvent(ChartEvent.RENDERED, { instance: this }, { bubbles: true }));
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
      const promises = interval.splitBy(this.options.mode.interval).map((dt, idx) => this.renderColumn(dt.start, idx));

      Promise.all(promises).then(columns => {
        const chartHeader = document.createElement(`div`);
        const chartBody = document.createElement(`div`);

        if(columns.length > 0)
        {
          Object.assign(chartHeader.style, this.options.customization.chart.header.container.style);
          Object.assign(chartHeader.style, {
            overflow: `hidden`,
            width: `min-content`,
          });

          chartHeader.append(...columns);

          Object.assign(chartBody.style, this.options.customization.chart.body.container.style);
          Object.assign(chartBody.style, { minHeight: `${this.options.customization.chart.body.rowHeightEm}em`, height: `1px` });

          const bodyColumn = document.createElement(`div`);
          Object.assign(bodyColumn.style, this.options.customization.chart.body.style);
          Object.assign(bodyColumn.style, {
            height: `100%`,
          });

          const bodyColumns = [];

          for(let i = 0; i < columns.length; i++)
          {
            const cloned = bodyColumn.cloneNode(true);

            if(i === 0)
            {
              Object.assign(cloned.style, this.options.customization.chart.body.firstStyle);
            }
            else if( i === columns.length - 1)
            {
              Object.assign(cloned.style, this.options.customization.chart.body.lastStyle);
            }

            bodyColumns.push(cloned);
          }

          chartBody.append(...bodyColumns);
        }

        resolve({ chartHeader, chartBody });
      });
    });
  }

  /**
   * @private
   * @param {DateTime} dt
   * @param {Number} idx
   * @returns {Promise<Element>}
   */
  renderColumn(dt, idx)
  {
    return new Promise(resolve => {
      const headerContainer = document.createElement(`div`);
      Object.assign(headerContainer.style, this.options.customization.chart.header.style);
      headerContainer.innerHTML = format(this.options.customization.chart.header.template, { formatted: dt.toFormat(this.options.mode.format), idx });

      resolve(headerContainer);
    });
  }

  /**
   * @private
   */
  renderBars()
  {
    let bodyHeight = 0;
    return { bodyHeight };
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
