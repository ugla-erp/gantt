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
    options = options ?? {};
    options.detail = detail ?? {};
    return new CustomEvent(type, options);
  }

  /**
   * @type {String}
   * @const
   * @default `gantt`
   * @private
   */
  static EVENT_NAMESPACE = `gantt`;

  /**
   * @type {String}
   * @const
   * @default `gantt:rendered`
   */
  static RENDERED = `${this.EVENT_NAMESPACE}:rendered`;

  /**
   * @type {String}
   * @const
   * @default `gantt:startlinemove`
   */
  static LINE_MOVE_START = `${this.EVENT_NAMESPACE}:startlinemove`;

  /**
   * @type {String}
   * @const
   * @default `gantt:endlinemove`
   */
  static LINE_MOVE_END = `${this.EVENT_NAMESPACE}:endlinemove`;
}

export default ChartEvent;
