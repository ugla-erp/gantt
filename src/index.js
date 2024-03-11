import UGLAGanttOptions from "./options";

/**
 * @type {UGLAGantt}
 * @property {UGLAGanttOptions} options
 */
class UGLAGantt
{
  /**
   * 
   * @param {Node} container
   * @param {UGLAGanttOptions} [options={}]
   * @returns {UGLAGantt}
   */
  static init(container, options = {})
  {
    if(!container instanceof Node)
    {
      throw new Error(`Expected argument of type Node, got ${typeof container}`);
    }

    if(typeof options !== `object` || options === null)
    {
      options = {};
    }

    const instance = new this(false);

    instance.options = options;

    return instance;
  }

  /**
   * @type {UGLAGanttOptions}
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