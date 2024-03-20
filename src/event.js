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
   * @default `gantt:barclick`
   * @see {@link ChartEvent#event:ChartBarClick|ChartBarClick}
   */
  static BARCLICK = `${this.EVENT_NAMESPACE}:barclick`;

  /**
   * @type {String}
   * @const
   * @default `gantt:bardblclick`
   * @see {@link ChartEvent#event:ChartBarDoubleClick|ChartBarDoubleClick}
   */
  static BARDBLCLICK = `${this.EVENT_NAMESPACE}:bardblclick`;

  /**
   * @type {String}
   * @const
   * @default `gantt:barhover`
   * @see {@link ChartEvent#event:ChartBarHover|ChartBarHover}
   */
  static BARHOVER = `${this.EVENT_NAMESPACE}:barhover`;

  // /**
  //  * @type {String}
  //  * @const
  //  * @default `gantt:startbarmove`
  //  */
  // static START_BAR_MOVE = `${this.EVENT_NAMESPACE}:startbarmove`;

  // /**
  //  * @type {String}
  //  * @const
  //  * @default `gantt:endbarmove`
  //  */
  // static END_BAR_MOVE = `${this.EVENT_NAMESPACE}:endbarmove`;
}

export default ChartEvent;
