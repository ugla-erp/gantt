import UGLAGanttOptions from "./options";

/**
 * @type {UGLAGantt}
 * @property {UGLAGanttOptions} options
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

    const instance = new this(false);

    instance.container = container;
    instance.options = options;

    return instance;
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
}

export { UGLAGantt };