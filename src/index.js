import { merge } from "lodash";
import ChartEvent from "./event";
import ChartMode from "./mode";
import { DOCS_FULL_URL } from "./utils.js";
import { DateTime, Interval } from "luxon";
import format from "string-template";
import ChartBar from "./bar.js";
import { Grid, BestFirstFinder, Util } from "pathfinding";

/**
 * DateTime object from {@link https://moment.github.io/luxon|luxon}
 * @external DateTime
 * @see {@link https://moment.github.io/luxon/api-docs/index.html#datetime|DateTime}
 */

/**
 * @typedef {Object} ChartCoordinates
 * @property {Object} center
 * @property {Number} center.x offset from the left, in a number of columns
 * @property {Number} center.y offset from the top, in a number of rows
 * @property {Object} top
 * @property {Number} top.x offset from the left, in a number of columns
 * @property {Number} top.y offset from the top, in a number of rows
 * @property {Object} right
 * @property {Number} right.x offset from the left, in a number of columns
 * @property {Number} right.y offset from the top, in a number of rows
 * @property {Object} bottom
 * @property {Number} bottom.x offset from the left, in a number of columns
 * @property {Number} bottom.y offset from the top, in a number of rows
 * @property {Object} left
 * @property {Number} left.x offset from the left, in a number of columns
 * @property {Number} left.y offset from the top, in a number of rows
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
   * @param {ChartBar[]} data
   * @returns {Chart}
   */
  static get(container, options, start, end, data)
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
      instance.setPeriod(start, end, false);

      if(data !== undefined)
      {
        instance.setData(data);
      }
      else
      {
        instance.render();
      }
    }
    else if(options !== undefined)
    {
      instance.options = options;
      instance.processOptions();

      if(start !== undefined || end !== undefined)
      {
        instance.setPeriod(start, end, false);
      }

      if(data !== undefined)
      {
        instance.setData(data);
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
   * @private
   * @type {Map<String,Number>}
   */
  formatToColumnMap = new Map();

  /**
   * @private
   * @type {Map<String,ChartBar[]>}
   */
  barIDToDataMap = new Map();

  /**
   * @private
   * @type {Grid}
   */
  pathfindingGrid;

  /**
   * @private
   */
  pathfinder = new BestFirstFinder();

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
  columnWidthEm = 0.0;

  /**
   * @readonly
   * @type {Number}
   */
  rowHeight = 0.0;

  /**
   * Height of the {@link Chart} measured in number of rows
   * @readonly
   * @type {Number}
   */
  chartHeight = 0;

  /**
   * @readonly
   * @type {Number}
   */
  columnsNumber = 0;

  // CONSTANTS

  /**
   * @private
   * @constant
   * @type {Number}
   */
  static BAR_HEIGHT_COEFFICIENT = 0.6;

  /**
   * @private
   * @constant
   * @type {Number}
   */
  static BAR_HORIZONTAL_MARGIN = 0.3;

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
   * @property {Boolean} [customization.chart.panning=true]
   * @property {Number} [customization.chart.panSpeed=1]
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
   * @property {Object} customization.chart.bar
   * @property {String} [customization.chart.bar.class=``]
   * @property {CSSStyleDeclaration} [customization.chart.bar.style={}]
   * @property {Number} [customization.chart.bar.heightCoef=0.6] A number between 0 and 1 (0, 1]. Represents the percentage of row height that a bar will take up. The bar will be automatically centered vertically. If not between 0 and 1, will revert to default value
   * @property {Number} [customization.chart.bar.horizontalMarginEm=0.3]
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
          height: `100%`,
        },
      },
      chart: {
        minWidthEm: 2,
        panning: true,
        panSpeed: 1,
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
              flexGrow: 1,
              position: `relative`,
            },
          },
          firstStyle: {},
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
        bar: {
          heightCoef: this.BAR_HEIGHT_COEFFICIENT,
          horizontalMarginEm: this.BAR_HORIZONTAL_MARGIN,
          class: ``,
          style: {
            background: `red`,
            borderRadius: `1em`,
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
    return this.chartScroll?.childNodes?.[0];
  }

  /**
   * @type {Element|undefined}
   * @readonly
   */
  get chartBody()
  {
    return this.chartScroll?.childNodes?.[1];
  }

  /**
   * @type {Element|undefined}
   * @readonly
   */
  get chartScroll()
  {
    return this.container?.childNodes?.[0];
  }

  /**
   * @type {HTMLCanvasElement|undefined}
   * @readonly
   */
  get chartCanvas()
  {
    return this.chartBody?.childNodes?.[this.columnsNumber];
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
      this.columnWidthEm = trueColumnWidth / bodyColumnFontSize;
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

    this.reindexData();

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

    /**
     * Bar height coefficient check
     */
    if(typeof this.options.customization.chart.bar.heightCoef !== `number` || this.options.customization.chart.bar.heightCoef <= 0 || this.options.customization.chart.bar.heightCoef > 1)
    {
      console.warn(`Option {customization.chart.bar.heightCoef} reverted back to '${this.BAR_HEIGHT_COEFFICIENT}' due to invalid value - '${this.options.customization.chart.bar.heightCoef}'`);
      this.options.customization.chart.bar.heightCoef = this.BAR_HEIGHT_COEFFICIENT;
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

    this.reindexData();

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
   * @private
   */
  reindexData()
  {
    this.buildFormatToColumnMap();

    if(this.data !== undefined)
    {
      this.data.forEach(bar => {
        bar.startIDX = this.formatToColumnMap.get(bar.start.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
        bar.endIDX = this.formatToColumnMap.get(bar.end.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
      });
      this.calculateChartHeight();
      this.buildPathfindingGrid();
    }
  }

  /**
   * @private
   */
  buildFormatToColumnMap()
  {
    this.formatToColumnMap.clear();
    const interval = Interval.fromDateTimes(this.start, this.end);
    interval.splitBy(this.options.mode.interval).map((dt, idx) => this.formatToColumnMap.set(dt.start.toFormat(this.options.mode.idxFormat ?? this.options.mode.format), idx));
  }

  /**
   * @private
   */
  buildBarIDToDataMap()
  {
    this.barIDToDataMap.clear();

    this.data.forEach(bar => {
      const arr = this.barIDToDataMap.get(String(bar.id)) ?? [];
      arr.push(bar);
      this.barIDToDataMap.set(String(bar.id), arr);
    });
  }

  /**
   * @private
   */
  buildPathfindingGrid()
  {
    const sorted = this.data.toSorted((a, b) => {
      if(a.yIndex > b.yIndex)
      {
        return 1;
      }
      else
      {
        return -1;
      }
    });

    const gridLastIDX = (this.columnsNumber) * 2;
    const emptyRow = Array(this.chartHeight * 2).fill(0);
    const matrix = [];

    sorted.forEach(bar => {
      const length = ((bar.endIDX - bar.startIDX + 1) * 2) - 1;
      const start = (bar.startIDX * 2) + 1;
      const end = (bar.endIDX * 2) + 1;

      let rowArray = Array(gridLastIDX);

      if(start > 0)
      {
        rowArray = rowArray.fill(0, 0, start)
      }

      rowArray = rowArray.fill(1, start, start + length);

      if(end < gridLastIDX)
      {
        rowArray = rowArray.fill(0, end + 1, gridLastIDX);
      }

      matrix.push(rowArray);
      matrix.push(emptyRow);
    });

    if(matrix.length > 0)
    {
      this.pathfindingGrid = new Grid(matrix);
    }
  }

  /**
   * @param {ChartBar[]} data
   * @param {Boolean} [render=true]
   * @param {Boolean} [renderOnlyBars=false] if set to `true`, only {@link ChartBar|ChartBars} will be rendered, not the entire {@link Chart}
   * @returns {Promise<Chart>}
   */
  setData(data, render = true, renderOnlyBars = false)
  {
    /**
     * @param {ChartBar} bar
     */
    data.forEach(bar => {
      this.processBar(bar);
    });

    this.data = data;
    this.buildBarIDToDataMap();
    this.calculateChartHeight();

    return !render ? Promise.resolve(Chart) : (renderOnlyBars ? this.renderBars() : this.render());
  }

  /**
   * @private
   */
  calculateChartHeight()
  {
    const sorted = this.data.toSorted((a, b) => {
      if(a.startIDX === b.startIDX)
      {
        const aMillis = a.start.toMillis();
        const bMillis = b.start.toMillis();
        if(aMillis === bMillis)
        {
          return 0;
        }
        else if(aMillis > bMillis)
        {
          return -1;
        }
        else
        {
          return 1;
        }
      }
      else if(a.startIDX > b.startIDX)
      {
        return 1;
      }
      else
      {
        return -1;
      }
    });

    sorted.forEach((bar, idx) => {
      bar.yIndex = idx;
    });

    this.chartHeight = Math.max(sorted.length, 1);
  }

  /**
   * @returns {Promise<Chart>}
   */
  renderBars()
  {
    return new Promise(resolve => {
      const rowHeightEm = this.options.customization.chart.body.rowHeightEm;
      const barHeightCoef = this.options.customization.chart.bar.heightCoef;

      const promises = this.data.map((bar, dataIDX) => {
        return new Promise(resolveBar => {
          const uid = `${dataIDX}_${bar.id}`;

          let barEl = this.container.querySelector(`[${this.attributeName(`bar-uid`)}="${uid}"]`);

          if(barEl === null)
          {
            barEl = document.createElement(`span`);

            this.initBarEvents(bar, barEl);

            this.setAttribute(`bar-id`, bar.id, barEl);
            this.setAttribute(`bar-uid`, uid, barEl);
          }

          barEl.className = this.options.customization.chart.bar.class;
          Object.assign(barEl.style, this.options.customization.chart.bar.style);

          barEl.style.left = `${bar.startIDX * this.columnWidthEm + this.options.customization.chart.bar.horizontalMarginEm}em`;
          barEl.style.top = `${(bar.yIndex * rowHeightEm) + rowHeightEm * ((1 - barHeightCoef) / 2)}em`;

          barEl.style.height = `${rowHeightEm * barHeightCoef}em`;
          barEl.style.width = `${((bar.endIDX - bar.startIDX + 1) * this.columnWidthEm) - this.options.customization.chart.bar.horizontalMarginEm * 2}em`;
          barEl.style.position = `absolute`;

          barEl.UGLAGanttBarData = bar;

          resolveBar({ barEl, uid});
        });
      });

      Promise.all(promises).then(async data => {
        /**
         * @type {Element[]}
         */
        const bars = data.map(el => el.barEl);
        /**
         * @type {Set<String>}
         */
        const uids = new Set(data.map(el => el.uid));

        for(let i = this.chartBody.childNodes.length - 1; i >= this.columnsNumber; i--)
        {
          if(!(this.chartBody.childNodes[i] instanceof HTMLCanvasElement) && !uids.has(this.getAttribute(`bar-uid`, undefined, this.chartBody.childNodes[i])))
          {
            this.chartBody.childNodes[i].remove();
          }
        }

        this.chartBody.append(...bars);

        this.buildPathfindingGrid();

        await this.renderConnectingLines();

        resolve(this);
      });
    });
  }

  /**
   * @returns {Promise<Chart>}
   */
  renderConnectingLines()
  {
    const context = this.chartCanvas.getContext(`2d`);

    context.lineCap = `round`;
    context.lineJoin = `round`;
    context.lineWidth = this.options.customization.connectingLines.thickness;

    return new Promise(resolve => {
      const promises = [];
      this.data.forEach(bar => {
        bar.connectedTo?.forEach(barID => {
          this.barIDToDataMap.get(String(barID))?.forEach(barTo => {
            promises.push(this.drawLineBetween(bar, barTo));
          });
        });
      });

      Promise.all(promises).then(() => resolve(this));
    });
  }

  /**
   * @private
   * @param {ChartBar} barFrom
   * @param {ChartBar} barTo
   * @returns {Promise<void>}
   */
  drawLineBetween(barFrom, barTo)
  {
    return new Promise(resolve => {
      const from = this.getBarCoordinates(barFrom);
      const to = this.getBarCoordinates(barTo);

      console.log(from);

      console.log(from.right.x, from.right.y, to.left.x, to.left.y)
      const r2l = this.pathfinder.findPath(from.right.x, from.right.y, to.left.x, to.left.y, this.pathfindingGrid);

      console.log(r2l)

      resolve();
    });
  }

  /**
   * @param {ChartBar} bar
   * @param {boolean} [inGridCoordinates=true]
   * @returns {ChartCoordinates}
   */
  getBarCoordinates(bar, inGridCoordinates = true)
  {
    /**
     * @type {ChartCoordinates}
     */
    const coords = {
      center: { x: 0, y: 0 },
      top: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
      left: { x: 0, y: 0 },
      bottom: { x: 0, y: 0 },
    };

    const length = (bar.endIDX - bar.startIDX + 1);

    coords.center.y = bar.yIndex + 0.5;
    coords.center.x = bar.startIDX + (length / 2);

    coords.top.y = coords.center.y - 0.5;
    coords.top.x = coords.center.x;

    coords.right.y = coords.center.y;
    coords.right.x = bar.endIDX + 1;

    coords.bottom.y = coords.center.y + 0.5;
    coords.bottom.x = coords.center.x;

    coords.left.y = coords.center.y;
    coords.left.x = bar.startIDX;

    if(inGridCoordinates)
    {
      coords.center.y *= 2;
      coords.top.y *= 2;
      coords.right.y *= 2;
      coords.bottom.y *= 2;
      coords.left.y *= 2;

      coords.center.x *= 2;
      coords.top.x *= 2;
      coords.right.x *= 2;
      coords.bottom.x *= 2;
      coords.left.x *= 2;
    }

    return coords;
  }

  /**
   * @param {ChartBar} bar
   * @param {Element} barEl
   */
  initBarEvents(bar, barEl)
  {
    barEl.addEventListener(`click`, (e) => {
      /**
       * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
       * @event ChartEvent#ChartBarClick
       * @type {Event}
       * @property {Object} detail
       * @property {Chart} detail.chart
       * @property {ChartBar} detail.bar
       * @see {@link ChartEvent#BARCLICK}
       */
      this.trigger(new ChartEvent(ChartEvent.BARCLICK, { chart: this, bar }, { bubbles: true, cancelable: true }));
    });

    barEl.addEventListener(`dblclick`, (e) => {
      /**
       * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
       * @event ChartEvent#ChartBarDoubleClick
       * @type {Event}
       * @property {Object} detail
       * @property {Chart} detail.chart
       * @property {ChartBar} detail.bar
       * @see {@link ChartEvent#BARDBLCLICK}
       */
      this.trigger(new ChartEvent(ChartEvent.BARDBLCLICK, { chart: this, bar }, { bubbles: true, cancelable: true }));
    });

    barEl.addEventListener(`mouseover`, (e) => {
      /**
       * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
       * @event ChartEvent#ChartBarHover
       * @type {Event}
       * @property {Object} detail
       * @property {Chart} detail.chart
       * @property {ChartBar} detail.bar
       * @see {@link ChartEvent#BARHOVER}
       */
      this.trigger(new ChartEvent(ChartEvent.BARHOVER, { chart: this, bar }, { bubbles: true, cancelable: true }));
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
      bar.startIDX = this.formatToColumnMap.get(bar.start.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
    }

    if(bar.endIDX === undefined)
    {
      bar.end = this.castToDateTime(bar.end);
      bar.endIDX = this.formatToColumnMap.get(bar.end.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
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
        const { chartHeader, chartBody } = await this.renderChartTemplate();

        const scrollBody = document.createElement(`div`);

        Object.assign(scrollBody.style, {
          display: `flex`,
          flexDirection: `column`,
          width: `100%`,
          height: `100%`,
          overflowX: `auto`,
          overflowY: `hidden`,
        });

        scrollBody.append(chartHeader, chartBody);

        this.container.replaceChildren(scrollBody);

        this.initPan();
        this.updateColumnWidth();

        const computedStyle = window.getComputedStyle(chartBody);
        const borderHeightsEm = ((parseFloat(computedStyle.borderTopWidth) || 0) + (parseFloat(computedStyle.borderBottomWidth) || 0)) / parseFloat(computedStyle.fontSize);
        Object.assign(chartBody.style, { height: `${this.options.customization.chart.body.rowHeightEm * this.chartHeight + borderHeightsEm}em` });

        await this.renderBars();

        resolve(this);

        /**
         * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
         * @event ChartEvent#ChartRendered
         * @type {Event}
         * @property {Object} detail
         * @property {Chart} detail.chart
         * @see {@link ChartEvent#RENDERED}
         */
        this.trigger(new ChartEvent(ChartEvent.RENDERED, { chart: this }, { bubbles: true, cancelable: true }));
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
  renderChartTemplate()
  {
    return new Promise(resolve => {
      const interval = Interval.fromDateTimes(this.start, this.end);
      const promises = interval.splitBy(this.options.mode.interval).map((dt, idx) => this.renderColumn(dt.start, idx));

      Promise.all(promises).then(columns => {
        const chartHeader = document.createElement(`div`);
        const chartBody = document.createElement(`div`);

        this.columnsNumber = columns.length;

        if(columns.length > 0)
        {
          Object.assign(chartHeader.style, this.options.customization.chart.header.container.style);
          Object.assign(chartHeader.style, {
            overflow: `hidden`,
            width: `min-content`,
            minWidth: `100%`,
          });

          chartHeader.append(...columns);

          Object.assign(chartBody.style, this.options.customization.chart.body.container.style);

          const bodyColumn = document.createElement(`div`);
          Object.assign(bodyColumn.style, this.options.customization.chart.body.style);
          Object.assign(bodyColumn.style, {
            height: `${this.chartHeight * this.options.customization.chart.body.rowHeightEm}em`,
            minHeight: `100%`,
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
          const canvas = document.createElement(`canvas`);
          canvas.style.position = `absolute`;
          canvas.style.width = `100%`;
          canvas.style.height = `100%`;
          chartBody.append(canvas);
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
   * 
   * @param {Number} x
   * @param {Number} y
   * @param {boolean} [smooth=true]
   */
  scrollTo(x, y, smooth = true)
  {
    const xOldScrollBehavior = this.chartScroll.style.scrollBehavior;
    this.chartScroll.style.scrollBehavior = smooth ? `smooth` : `auto`;
    this.chartScroll.scrollLeft = x;
    this.chartScroll.style.scrollBehavior = xOldScrollBehavior;

    const yOldScrollBehavior = this.chartBody.style.scrollBehavior;
    this.chartBody.style.scrollBehavior = smooth ? `smooth` : `auto`;
    this.chartBody.scrollLeft = y;
    this.chartBody.style.scrollBehavior = yOldScrollBehavior;
  }

  /**
   * @param {ChartEvent} event
   * @private
   */
  trigger(event)
  {
    this.container.dispatchEvent(event);
  }

  // PANNING

  #mouseIsDown = false;
  #startY = 0;
  #startScrollTop = 0;
  #startX = 0;
  #startScrollLeft = 0;

  /**
   * @private
   * @param {Element} chartBody 
   */
  initPan()
  {
    if(!this.options.customization.chart.panning)
    {
      return;
    }

    this.chartBody.addEventListener(`mousedown`, (e) => {
      this.#mouseIsDown = true;

      this.#startY = e.pageY - this.chartBody.offsetTop;
      this.#startScrollTop = this.chartBody.scrollTop;
      this.#startX = e.pageX - this.chartScroll.offsetLeft;
      this.#startScrollLeft = this.chartScroll.scrollLeft;
    });

    this.chartBody.addEventListener(`mouseup`, () => {
      this.#mouseIsDown = false;
    });

    this.chartBody.addEventListener(`mouseleave`, () => {
      this.#mouseIsDown = false;
    });

    this.chartBody.addEventListener(`mousemove`, (e) => {
      if(!this.#mouseIsDown)
      {
        return;
      }

      e.preventDefault();

      const x = e.pageX - this.chartScroll.offsetLeft;
      const deltaX = (x - this.#startX) * this.options.customization.chart.panSpeed;

      const y = e.pageY - this.chartScroll.offsetLeft;
      const deltaY = (y - this.#startY) * this.options.customization.chart.panSpeed;

      this.chartScroll.scrollLeft = this.#startScrollLeft - deltaX;
      this.chartBody.scrollTop = this.#startScrollTop - deltaY;
    });
  }
}

export { Chart, ChartEvent };
