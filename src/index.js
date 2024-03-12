/**
 * @typedef {Object} UGLAGanttOptions
 * @property {Object} theming
 * @property {Object} theming.connectingLines
 * @property {String} [theming.connectingLines.class=`gantt__connecting_line`]
 */
const defaultOptions = {
  theming: {
    connectingLines: {
      class: `gantt__connecting_line`,
    },
  },
};

/**
 * <code>console.log(`I'm a little avocado!`)</code>
 * @type {UGLAGantt}
 * @hideconstructor
 */
class UGLAGantt
{
  /**
   * 
   * @param {Element} container
   * @param {UGLAGanttOptions} [options={}]
   * @returns {UGLAGantt}
   */
  static init(container, options = {})
  {
    if(!container instanceof Element)
    {
      throw new Error(`Expected argument of type Element, got ${typeof container}`);
    }

    if(typeof options !== `object` || options === null)
    {
      options = {};
    }

    let instance = this.#findExistingInstance(container);

    if(instance === null)
    {
      instance = new this(false);
  
      instance.container = container;
    }

    instance.options = options;

    return instance;
  }

  /**
   * @param {Element} container 
   * @private
   */
  static #findExistingInstance(container)
  {

  }

  /**
   * @type {Element}
   * @readonly
   */
  container;

  /**
   * @type {UGLAGanttOptions}
   * @readonly
   */
  options;

  constructor(warn = true)
  {
    if(warn)
    {
      console.warn(`You should not use the constructor directly, unless you know what you are doing. It's better to use ${this.constructor.name}.init() instead.`)
    }
  }

  /**
   * @private
   */
  loadOptions()
  {
    
  }
}

export { UGLAGantt };