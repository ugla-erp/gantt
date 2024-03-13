import { merge } from "lodash";

/**
 * @typedef {Object} ChartOptions
 * @property {String} [attributePrefix=`data-ugla-gantt`]
 * @property {Object} theming
 * @property {Object} theming.connectingLines Configuration relating to the lines that are drawn onto the canvas, connecting {@link ChartItem} instances
 * @property {Number} [theming.connectingLines.thickness=2]
 * @property {String} [theming.connectingLines.color=`#000000`]
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
   * @returns {Chart}
   */
  static get(container, options)
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
      instance = new this(false);

      instance.container = container;
      instance.options = options;

      container.UGLAGanttInstance = instance;
      instance.setAttribute(`container`, ``);
    }
    else if(options !== undefined)
    {
      instance.options = options;
    }

    console.log(instance)

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

  constructor(warn = true)
  {
    if(warn)
    {
      console.warn(`You should not use the constructor directly, unless you know what you are doing. It's better to use ${this.constructor.name}.get() instead.`)
    }
  }

  /**
   * @type {ChartOptions}
   * @const
   */
  static defaultOptions = {
    attributePrefix: `data-gantt`,
    theming: {
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
  setAttribute(name, value)
  {
    this.container.setAttribute(this.attributeName(name), value);
  }

  /**
   * @private
   */
  getAttribute(name, defaultValue = undefined)
  {
    return this.container.getAttribute(this.attributeName(name)) ?? defaultValue;
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
    return new Promise((resolve, reject) => {
      this.renderCanvas()
        .then(() => {
          resolve(this);
          this.trigger(new ChartEvent(ChartEvent.RENDERED, { bubbles: true }));
        })
        .catch(err => {
          console.error(err);
          reject(err);
        });
    });
  }

  /**
   * @private
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise|Promise}
   * @returns {Promise<void>}
   */
  renderCanvas()
  {
    return new Promise((resolve, reject) => {

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

/**
 * @type {ChartEvent}
 * @hideconstructor
 */
class ChartEvent
{
  /**
   * 
   * @param {String} type 
   * @param {Object|undefined} detail
   * @param {EventInit|undefined} options 
   */
  constructor(type, detail, options)
  {
    options.detail = detail ?? {};
    return new CustomEvent(type, options);
  }

  /**
   * @type {String}
   * @const
   * @default `uglagantt:rendered`
   */
  static RENDERED = `uglagantt:rendered`;

  /**
   * @type {String}
   * @const
   * @default `uglagantt:startlinemove`
   */
  static LINE_MOVE_START = `uglagantt:startlinemove`;

  /**
   * @type {String}
   * @const
   * @default `uglagantt:endlinemove`
   */
  static LINE_MOVE_END = `uglagantt:endlinemove`;
}

export { Chart };