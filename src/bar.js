/**
 * @type {ChartBar}
 * @hideconstructor
 */
class ChartBar
{
  /**
   * @type {String}
   */
  id;

  /**
   * Column index. If provided, then {@link ChartBar#start} is ignored. Otherwise calculated by casting {@link ChartBar#start} to {@link external:DateTime|DateTime} and formatting with {@link ChartMode#idxFormat}, or {@link ChartMode#format} if {@link ChartMode#idxFormat} is not provided
   * @type {Number}
   */
  startIDX;

  /**
   * If a String or a Number, will be treated as UTC, and then converted to {@link ChartOptions#timezone}. If {@link external:DateTime|DateTime}, will only convert to {@link ChartOptions#timezone}
   * @type {external:DateTime|String|Number}
   */
  start;

  /**
   * Column index. If provided, then {@link ChartBar#end} is ignored. Otherwise calculated by casting {@link ChartBar#end} to {@link external:DateTime|DateTime} and formatting with {@link ChartMode#idxFormat}, or {@link ChartMode#format} if {@link ChartMode#idxFormat} is not provided
   * @type {Number}
   */
  endIDX;

  /**
   * If a String or a Number, will be treated as UTC, and then converted to {@link ChartOptions#timezone}. If {@link external:DateTime|DateTime}, will only convert to {@link ChartOptions#timezone}
   * @type {external:DateTime|String|Number}
   */
  end;

  /**
   * Array of {@link ChartBar#id}
   * @type {String[]}
   * @default []
   */
  connectedTo = [];

  /**
   * @type {String}
   * @default ``
   */
  content = ``;

  /**
   * @type {Boolean}
   * @default false
   */
  contentIsHTML = false;

  /**
   * Once the {@link Bar} is processed, it is assigned a vertical index, which is used for rendering
   * @readonly
   * @type {Number}
   */
  yIndex;
}

export default ChartBar;
