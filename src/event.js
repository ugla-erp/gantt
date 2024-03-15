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
   * @see {@link ChartEvent#event:ChartRendered|ChartRendered}
   */
  static RENDERED = `${this.EVENT_NAMESPACE}:rendered`;

  /**
   * @type {String}
   * @const
   * @default `gantt:startbarmove`
   */
  static START_BAR_MOVE = `${this.EVENT_NAMESPACE}:startbarmove`;

  /**
   * @type {String}
   * @const
   * @default `gantt:endbarmove`
   */
  static END_BAR_MOVE = `${this.EVENT_NAMESPACE}:endbarmove`;
}

export default ChartEvent;
