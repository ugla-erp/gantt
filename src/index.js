import { merge } from "lodash";
import ChartEvent from "./event";

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
      instance.render();
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
    return new Promise(async (resolve, reject) => {
      try
      {
        await this.renderCanvas();
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
   * @async
   * @returns {void}
   */
  async renderCanvas()
  {

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

export default { Chart, ChartEvent };
