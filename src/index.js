import { merge } from "lodash";
import ChartEvent from "./event";
import ChartMode from "./mode";
import { DOCS_FULL_URL } from "./utils.js";
import { DateTime, Interval } from "luxon";
import format from "string-template";
import ChartBar from "./bar.js";
import { Grid, BestFirstFinder } from "pathfinding";

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
   * @type {external:DateTime|Number}
   * @readonly
   */
  start;

  /**
   * @type {external:DateTime|Number}
   * @readonly
   */
  end;

  /**
   * @type {ChartBar[]}
   * @readonly
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

  /**
   * @readonly
   * @type {Number}
   */
  get rowsNumber()
  {
    return this.data.length;
  }

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
  static BAR_HORIZONTAL_MARGIN = 0.8;

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
   * @property {Boolean} [editableBars=true]
   * @property {Boolean} [panning=true]
   * @property {Number} [panSpeed=1]
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
   * @property {Object} customization.chart.bar
   * @property {String} [customization.chart.bar.class=``]
   * @property {Boolean} [customization.chart.bar.highlightConnectedOnHover=true]
   * @property {CSSStyleDeclaration} [customization.chart.bar.style={}]
   * @property {Number} [customization.chart.bar.heightCoef=0.6] A number between 0 and 1 (0, 1]. Represents the percentage of row height that a bar will take up. The bar will be automatically centered vertically. If not between 0 and 1, will revert to default value
   * @property {Number} [customization.chart.bar.horizontalMarginEm=0.8]
   * 
   * @property {Object} customization.connectingLines Configuration relating to the lines that are drawn onto the canvas, connecting {@link Bar} instances
   * @property {Number} [customization.connectingLines.thickness=2]
   * @property {String} [customization.connectingLines.color=`#464646`]
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
    editableBars: true,
    panning: true,
    panSpeed: 1,
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
          firstStyle: {
            borderLeftWidth: `0.1em`,
          },
          lastStyle: {
            borderRightWidth: `0.1em`,
          },
          style: {
            borderLeftColor: `#464646`,
            borderLeftStyle: `dashed`,
            borderLeftWidth: `0.05em`,
            borderRightColor: `#464646`,
            borderRightStyle: `dashed`,
            borderRightWidth: `0.05em`,
          },
        },
        bar: {
          heightCoef: this.BAR_HEIGHT_COEFFICIENT,
          horizontalMarginEm: this.BAR_HORIZONTAL_MARGIN,
          highlightConnectedOnHover: true,
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
    const canvas = this.chartBody?.childNodes?.[this.columnsNumber];

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    return canvas;
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

    this.options.mode.index = this.options.mode.index === undefined ? false : this.options.mode.index;

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
      if(this.options.mode.index === true)
      {
        if(typeof start === `number` && (start = parseInt(start)) >= 0)
        {
          this.start = start;
        }
        else
        {
          throw new Error(`In Index mode 'start' parameter must be an unsigned integer`);
        }
      }
      else
      {
        this.start = this.castToDateTime(start);
      }
    }

    if(end !== undefined)
    {
      if(this.options.mode.index === true)
      {
        if(typeof end === `number` && (end = parseInt(end)) >= 0)
        {
          this.end = end;
        }
        else
        {
          throw new Error(`In Index mode 'end' parameter must be an unsigned integer`);
        }
      }
      else
      {
        this.end = this.castToDateTime(end);
      }
    }

    this.reindexData();

    return render ? this.render() : Promise.resolve(this);
  }

  /**
   * @private
   * @param {DateTime|String|Number|undefined} dt
   * @param {String|undefined}
   * @returns {DateTime}
   */
  castToDateTime(dt, format)
  {
    if(typeof dt === `number`)
    {
      return DateTime.fromSeconds(dt, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);
    }
    else if(typeof dt === `string`)
    {
      let result = null;
      if(format === undefined)
      {
        result = DateTime.fromFormat(dt, `yyyy-MM-dd HH:mm:ss`, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);
  
        result = result.isValid ? result : DateTime.fromFormat(dt, `yyyy-MM-dd`, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);
      }
      else
      {
        result = DateTime.fromFormat(dt, format, { zone: `UTC`, locale: this.options.locale }).setZone(this.options.timezone);
      }

      if(!result.isValid)
      {
        throw new Error(`Invalid DateTime from '${dt}' with format '${format || `undefined`}'`);
      }

      return result;
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
      if(this.options.mode.index !== true)
      {
        this.data.forEach(bar => {
          bar.startIDX = this.formatToColumnMap.get(bar.start.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
          bar.endIDX = this.formatToColumnMap.get(bar.end.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
        });
      }

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

    if(this.options.mode.index === true)
    {
      const interval = ((typeof this.options.mode.interval === `number`) ? parseInt(this.options.mode.interval) : 1);
      for(let i = this.start; i <= this.end; i += interval)
      {
        this.formatToColumnMap.set(i, i);
      }
    }
    else
    {
      const interval = Interval.fromDateTimes(this.start, this.end);
      interval.splitBy(this.options.mode.interval).map((dt, idx) => this.formatToColumnMap.set(dt.start.toFormat(this.options.mode.idxFormat ?? this.options.mode.format), idx));
    }
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

    const gridLastIDX = (this.columnsNumber) * 2 + 1;
    const emptyRow = Array(gridLastIDX).fill(0);
    const matrix = [emptyRow];

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
        if(this.options.mode.index === true)
        {
          return 0;
        }
        else
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
      }).catch(console.error);
    });
  }

  /**
   * @param {ChartBar|undefined} forBar
   * @returns {Promise<Chart>}
   */
  renderConnectingLines(forBar)
  {
    if(forBar !== undefined && (forBar.connectedTo === undefined || forBar.connectedTo.length === 0))
    {
      forBar = undefined;
    }

    const context = this.chartCanvas.getContext(`2d`);
    context.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);

    context.lineCap = `round`;
    context.lineJoin = `round`;
    context.lineWidth = this.options.customization.connectingLines.thickness;
    context.strokeStyle = this.options.customization.connectingLines.color;
    context.fillStyle = this.options.customization.connectingLines.color;

    return new Promise(resolve => {
      const promises = [];

      (forBar === undefined ? this.data : [forBar]).forEach(bar => {
        bar.connectedTo?.forEach(barID => {
          this.barIDToDataMap.get(String(barID))?.forEach(barTo => {
            promises.push(this.drawLineBetween(context, bar, barTo));
          });
        });
      });

      Promise.all(promises).then(() => resolve(this)).catch(console.error);
    });
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} context
   * @param {ChartBar} barFrom
   * @param {ChartBar} barTo
   * @returns {Promise<void>}
   */
  drawLineBetween(context, barFrom, barTo)
  {
    return new Promise(resolve => {
      const from = this.getBarCoordinates(barFrom);
      const to = this.getBarCoordinates(barTo);

      const gridr2l = this.pathfindingGrid.clone();
      const gridr2t = this.pathfindingGrid.clone();
      const gridb2l = this.pathfindingGrid.clone();
      const gridb2t = this.pathfindingGrid.clone();

      const paths = [
        { dir: `left`, path: this.pathfinder.findPath(from.right.x, from.right.y, to.left.x, to.left.y, gridr2l) }, // r2l
        { dir: `top`, path: this.pathfinder.findPath(from.right.x, from.right.y, to.top.x, to.top.y, gridr2t) }, // r2t
        { dir: `left`, path: this.pathfinder.findPath(from.bottom.x, from.bottom.y, to.left.x, to.left.y, gridb2l) }, // b2l
        { dir: `top`, path: this.pathfinder.findPath(from.bottom.x, from.bottom.y, to.top.x, to.top.y, gridb2t) }, // b2t
      ].filter(path => path.path.length > 0);

      paths.sort((a, b) => {
        if(a.path.length === b.path.length)
        {
          return 0;
        }
        else if(a.path.length > b.path.length)
        {
          return 1;
        }
        else
        {
          return -1;
        }
      });

      const shortest = paths[0];

      context.beginPath();

      context.moveTo(...this.pathGridCoordsToCanvasCoords(from.center));

      shortest.path.forEach(coords => {
        context.lineTo(...this.pathGridCoordsToCanvasCoords(coords));
      });

      const lastCoords = { x: shortest.path[shortest.path.length - 1][0], y: shortest.path[shortest.path.length - 1][1]};
      const arrowTipPoint = { x: lastCoords.x, y: lastCoords.y };

      if(shortest.dir === `left`)
      {
        arrowTipPoint.x += 0.18;
      }
      else
      {
        arrowTipPoint.y += 0.15;
      }

      context.lineTo(...this.pathGridCoordsToCanvasCoords(arrowTipPoint));

      context.stroke();
      context.closePath();

      this.drawArrow(context, this.pathGridCoordsToCanvasCoords(lastCoords, true), this.pathGridCoordsToCanvasCoords(arrowTipPoint, true), 6);

      resolve();
    });
  }

  /**
   * @private
   * @param {{x: Number, y: Number}|Array<Number, Number>} coords
   * @param {Boolean} [asObject=false]
   */
  pathGridCoordsToCanvasCoords(coords, asObject = false)
  {
    if(!Array.isArray(coords))
    {
      coords = [ coords.x, coords.y ];
    }

    const result = [coords[0] * this.columnWidth / 2, coords[1] * this.rowHeight / 2];

    return asObject ? { x: result[0], y: result[1] } : result;
  }

  /**
   * @private
   */
  drawArrow(context, from, to, radius)
  {
    let x_center = to.x;
    let y_center = to.y;
  
    let angle;
    let x;
    let y;
  
    context.beginPath();
  
    angle = Math.atan2(to.y - from.y, to.x - from.x)
    x = radius * Math.cos(angle) + x_center;
    y = radius * Math.sin(angle) + y_center;
  
    context.lineTo(x, y);
  
    angle += (1.0/3.0) * (2 * Math.PI)
    x = radius * Math.cos(angle) + x_center;
    y = radius * Math.sin(angle) + y_center;
  
    context.lineTo(x, y);
  
    angle += (1.0/3.0) * (2 * Math.PI)
    x = radius *Math.cos(angle) + x_center;
    y = radius *Math.sin(angle) + y_center;
  
    context.lineTo(x, y);
  
    context.closePath();
  
    context.fill();
  }

  /**
   * @private
   * @param {ChartBar} bar
   * @param {Boolean} [inPathFindingGridCoordinates=true]
   * @returns {Object}
   */
  getBarCoordinates(bar, inPathFindingGridCoordinates = true)
  {
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

    if(inPathFindingGridCoordinates)
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
   * @private
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

    barEl.addEventListener(`mouseenter`, (e) => {
      /**
       * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
       * @event ChartEvent#ChartBarMouseEnter
       * @type {Event}
       * @property {Object} detail
       * @property {Chart} detail.chart
       * @property {ChartBar} detail.bar
       * @see {@link ChartEvent#BARMOUSEENTER}
       */
      this.trigger(new ChartEvent(ChartEvent.BARMOUSEENTER, { chart: this, bar }, { bubbles: true, cancelable: true }));
    });

    barEl.addEventListener(`mouseleave`, (e) => {
      /**
       * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
       * @event ChartEvent#ChartBarMouseLeave
       * @type {Event}
       * @property {Object} detail
       * @property {Chart} detail.chart
       * @property {ChartBar} detail.bar
       * @see {@link ChartEvent#BARMOUSELEAVE}
       */
      this.trigger(new ChartEvent(ChartEvent.BARMOUSELEAVE, { chart: this, bar }, { bubbles: true, cancelable: true }));
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
      if(this.options.mode.index === true)
      {
        throw new Error(`In Index mode each bar must have 'startIDX' property as unsigned integer`);
      }
      else
      {
        bar.start = this.castToDateTime(bar.start);
        bar.startIDX = this.formatToColumnMap.get(bar.start.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
      }
    }
    else if(typeof bar.endIDX !== `number` && this.options.mode.index === true)
    {
      throw new Error(`In Index mode each bar must have 'endIDX' property as unsigned integer`);
    }

    if(bar.endIDX === undefined)
    {
      if(this.options.mode.index === true)
      {
        throw new Error(`In Index mode each bar must have 'endIDX' property as unsigned integer`);
      }
      else
      {
        bar.end = this.castToDateTime(bar.end);
        bar.endIDX = this.formatToColumnMap.get(bar.end.toFormat(this.options.mode.idxFormat ?? this.options.mode.format));
      }
    }
    else if(typeof bar.endIDX !== `number` && this.options.mode.index === true)
    {
      throw new Error(`In Index mode each bar must have 'endIDX' property as unsigned integer`);
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
        this.initEditableBars();
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
      let promises = [];

      if(this.options.mode.index === true)
      {
        const interval = ((typeof this.options.mode.interval === `number`) ? parseInt(this.options.mode.interval) : 1);
        for(let i = this.start; i <= this.end; i += interval)
        {
          promises.push(this.renderColumn(i, i));
        }
      }
      else
      {
        const interval = Interval.fromDateTimes(this.start, this.end);
        promises = interval.splitBy(this.options.mode.interval).map((dt, idx) => this.renderColumn(dt.start, idx));
      }

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
      }).catch(console.error);
    });
  }

  /**
   * @private
   * @param {DateTime|Number} dt
   * @param {Number} idx
   * @returns {Promise<Element>}
   */
  renderColumn(dt, idx)
  {
    return new Promise(resolve => {
      const headerContainer = document.createElement(`div`);
      Object.assign(headerContainer.style, this.options.customization.chart.header.style);
      headerContainer.innerHTML = format(this.options.customization.chart.header.template, { formatted: this.options.mode.index === true ? idx : dt.toFormat(this.options.mode.format), idx });

      resolve(headerContainer);
    });
  }

  /**
   * 
   * @param {Number} x
   * @param {Number} y
   * @param {Boolean} [smooth=true]
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

    if(event.type === ChartEvent.BARMOUSEENTER)
    {
      this.mouseEnterHandler(event.detail.bar);
    }
    else if(event.type === ChartEvent.BARMOUSELEAVE)
    {
      this.mouseLeaveHandler(event.detail.bar);
    }
  }

  /**
   * @private
   * @param {ChartBar} bar
   */
  mouseEnterHandler(bar)
  {
    if(this.options.customization.chart.bar.highlightConnectedOnHover === true)
    {
      this.renderConnectingLines(bar);
    }
  }

  /**
   * @private
   * @param {ChartBar} bar
   */
  mouseLeaveHandler(bar)
  {
    this.renderConnectingLines();
  }

  // MOVING BARS

  /**
   * @private
   */
  #movingBarData = {
    pointerIsDown: false,
    bar: null,
    startX: 0,
    startY: 0,
    startXBar: 0,
    startYBar: 0,
  };

  /**
   * @private
   */
  initEditableBars()
  {
    if(!this.options.editableBars)
    {
      return;
    }

    this.chartBody.addEventListener(`pointerdown`, (e) => {
      if(e.target.UGLAGanttBarData === undefined)
      {
        return;
      }

      this.#movingBarData.pointerIsDown = true;
      this.#movingBarData.bar = e.target.UGLAGanttBarData;

      this.#movingBarData.startX = e.pageX - this.chartScroll.offsetLeft;
      this.#movingBarData.startY = e.pageY - this.chartBody.offsetTop;
      this.#movingBarData.startXBar = this.#movingBarData.bar.startIDX * this.columnWidth;
      this.#movingBarData.startYBar = this.#movingBarData.bar.yIndex * this.rowHeight;
    });

    this.chartBody.addEventListener(`pointerup`, () => {
      this.#movingBarData.pointerIsDown = false;
    });

    this.chartBody.addEventListener(`pointerleave`, () => {
      this.#movingBarData.pointerIsDown = false;
    });

    this.chartBody.addEventListener(`pointermove`, (e) => {
      if(!this.#movingBarData.pointerIsDown)
      {
        return;
      }

      e.preventDefault();

      const x = e.pageX - this.chartScroll.offsetLeft;
      const deltaX = x - this.#movingBarData.startX;

      const y = e.pageY - this.chartBody.offsetTop;
      const deltaY = y - this.#movingBarData.startY;

      const xIndex = Math.min(this.columnsNumber - 1 - (this.#movingBarData.bar.endIDX - this.#movingBarData.bar.startIDX), Math.max(0, Math.round((this.#movingBarData.startXBar + deltaX) / this.columnWidth)));
      const yIndex = Math.min(this.rowsNumber - 1, Math.max(0, Math.round((this.#movingBarData.startYBar + deltaY) / this.rowHeight)));

      if(this.#movingBarData.bar.startIDX != xIndex)
      {
        const deltaXIndex = xIndex - this.#movingBarData.bar.startIDX;
        const interval = this.multipliedInterval(deltaXIndex);

        const from = {
          startIDX: this.#movingBarData.bar.startIDX,
          endIDX: this.#movingBarData.bar.endIDX,
          start: this.#movingBarData.bar.start,
          end: this.#movingBarData.bar.end,
        };

        this.#movingBarData.bar.endIDX = xIndex + (this.#movingBarData.bar.endIDX - this.#movingBarData.bar.startIDX);
        this.#movingBarData.bar.startIDX = xIndex;

        this.#movingBarData.bar.start = this.#movingBarData.bar.start?.plus(interval);
        this.#movingBarData.bar.end = this.#movingBarData.bar.end?.plus(interval);

        const to = {
          startIDX: this.#movingBarData.bar.startIDX,
          endIDX: this.#movingBarData.bar.endIDX,
          start: this.#movingBarData.bar.start,
          end: this.#movingBarData.bar.end,
        };

        const revert = () => {
          this.#movingBarData.bar.startIDX = from.startIDX;
          this.#movingBarData.bar.endIDX = from.endIDX;
          this.#movingBarData.bar.start = from.start;
          this.#movingBarData.bar.end = from.end;
          return this.renderBars();
        };

        this.renderBars();

        /**
       * <code>{ bubbles: <b>true</b>, cancellable: <b>true</b>, composed: <b>false</b> }</code>
       * @event ChartEvent#ChartBarMove
       * @type {Event}
       * @property {Object} detail
       * @property {Chart} detail.chart
       * @property {ChartBar} detail.bar
       * @property {Object} detail.from
       * @property {Number} detail.from.startIDX
       * @property {Number} detail.from.endIDX
       * @property {external:DateTime} detail.from.start
       * @property {external:DateTime} detail.from.end
       * @property {Object} detail.to
       * @property {Number} detail.to.startIDX
       * @property {Number} detail.to.endIDX
       * @property {external:DateTime} detail.to.start
       * @property {external:DateTime} detail.to.end
       * @property {function():Promise<Chart>} detail.revert
       * @see {@link ChartEvent#BARMOVE}
       */
      this.trigger(new ChartEvent(ChartEvent.BARMOVE, { chart: this, bar: this.#movingBarData.bar, from, to, revert }, { bubbles: true, cancelable: true }));
      }
    });
  }

  /**
   * @private
   */
  multipliedInterval(multiplier)
  {
    const newInterval = {};
    Object.keys(this.options.mode.interval).forEach(key => {
      newInterval[key] = this.options.mode.interval[key] * multiplier;
    });
    return newInterval;
  }

  // PANNING

  /**
   * @private
   */
  #panningData = {
    mouseIsDown: false,
    startY: 0,
    startScrollTop: 0,
    startX: 0,
    startScrollLeft: 0,
  };

  /**
   * @private
   */
  initPan()
  {
    if(!this.options.panning)
    {
      return;
    }

    this.chartBody.addEventListener(`mousedown`, (e) => {
      if(!(e.target instanceof HTMLCanvasElement))
      {
        return;
      }

      this.#panningData.mouseIsDown = true;

      this.#panningData.startY = e.pageY - this.chartBody.offsetTop;
      this.#panningData.startScrollTop = this.chartBody.scrollTop;
      this.#panningData.startX = e.pageX - this.chartScroll.offsetLeft;
      this.#panningData.startScrollLeft = this.chartScroll.scrollLeft;
    });

    this.chartBody.addEventListener(`mouseup`, () => {
      this.#panningData.mouseIsDown = false;
    });

    this.chartBody.addEventListener(`mouseleave`, () => {
      this.#panningData.mouseIsDown = false;
    });

    this.chartBody.addEventListener(`mousemove`, (e) => {
      if(!this.#panningData.mouseIsDown)
      {
        return;
      }

      e.preventDefault();

      const x = e.pageX - this.chartScroll.offsetLeft;
      const deltaX = (x - this.#panningData.startX) * this.options.panSpeed;

      const y = e.pageY - this.chartBody.offsetTop;
      const deltaY = (y - this.#panningData.startY) * this.options.panSpeed;

      this.chartScroll.scrollLeft = this.#panningData.startScrollLeft - deltaX;
      this.chartBody.scrollTop = this.#panningData.startScrollTop - deltaY;
    });
  }
}

export { Chart, ChartEvent };
